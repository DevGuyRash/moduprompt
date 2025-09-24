import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from '../app.js';

const exportOpenApi = async () => {
  const app = await buildApp();
  await app.ready();
  const spec = app.swagger();
  const outputPath = resolve(process.cwd(), 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
  await app.close();
};

exportOpenApi().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to export OpenAPI spec', error);
  process.exit(1);
});
