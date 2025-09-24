import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve } from 'node:path';
import type { Env } from '../../config/env.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface ExportStoragePutInput {
  key: string;
  body: Buffer;
  contentType: string;
  metadata: Record<string, string>;
}

export interface ExportStoragePutResult {
  uri: string;
  size: number;
  etag?: string;
}

export interface ExportStorage {
  put(input: ExportStoragePutInput): Promise<ExportStoragePutResult>;
}

const sanitizeKey = (baseDir: string, key: string): string => {
  const normalized = normalize(key).replace(/^\/+/, '');
  const resolved = resolve(baseDir, normalized);
  if (!resolved.startsWith(resolve(baseDir))) {
    throw new Error(`Invalid storage key path traversal detected for key: ${key}`);
  }
  return resolved;
};

const normalizeMetadata = (metadata: Record<string, string>): Record<string, string> => {
  return Object.keys(metadata)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      const value = metadata[key];
      acc[key.toLowerCase()] = typeof value === 'string' ? value : String(value);
      return acc;
    }, {});
};

class LocalExportStorage implements ExportStorage {
  constructor(private readonly baseDir: string) {}

  async put(input: ExportStoragePutInput): Promise<ExportStoragePutResult> {
    const absolute = sanitizeKey(this.baseDir, input.key);
    const directory = dirname(absolute);
    await mkdir(directory, { recursive: true });
    await writeFile(absolute, input.body);
    const metadataPath = `${absolute}.metadata.json`;
    const metadataPayload = {
      contentType: input.contentType,
      size: input.body.length,
      storedAt: new Date().toISOString(),
      metadata: normalizeMetadata(input.metadata),
    } satisfies Record<string, unknown>;
    await writeFile(metadataPath, `${JSON.stringify(metadataPayload, null, 2)}\n`);
    return {
      uri: `file://${absolute}`,
      size: input.body.length,
    };
  }
}

class S3ExportStorage implements ExportStorage {
  private readonly client: S3Client;

  constructor(private readonly env: Env) {
    if (!env.EXPORT_S3_BUCKET) {
      throw new Error('EXPORT_S3_BUCKET must be configured for S3 export storage.');
    }
    this.client = new S3Client({
      endpoint: env.EXPORT_S3_ENDPOINT,
      region: env.EXPORT_S3_REGION ?? 'us-east-1',
      forcePathStyle: env.EXPORT_S3_FORCE_PATH_STYLE ?? false,
      credentials:
        env.EXPORT_S3_ACCESS_KEY_ID && env.EXPORT_S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.EXPORT_S3_ACCESS_KEY_ID,
              secretAccessKey: env.EXPORT_S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async put(input: ExportStoragePutInput): Promise<ExportStoragePutResult> {
    const key = input.key.replace(/^\/+/, '');
    const metadata = normalizeMetadata(input.metadata);
    const command = new PutObjectCommand({
      Bucket: this.env.EXPORT_S3_BUCKET!,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: metadata,
    });
    const response = await this.client.send(command);
    return {
      uri: `s3://${this.env.EXPORT_S3_BUCKET}/${key}`,
      size: input.body.length,
      etag: response.ETag ?? undefined,
    };
  }
}

export const createExportStorage = (env: Env): ExportStorage => {
  if (env.EXPORT_STORAGE_DRIVER === 's3') {
    return new S3ExportStorage(env);
  }
  return new LocalExportStorage(resolve(env.EXPORT_LOCAL_STORAGE_PATH));
};
