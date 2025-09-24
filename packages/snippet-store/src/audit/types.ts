import type { AuditLogEntry } from '@moduprompt/types';

export interface AuditBufferRecord {
  id: string;
  entry: AuditLogEntry;
  bufferedAt: number;
  attempts: number;
  lastError?: string | null;
}
