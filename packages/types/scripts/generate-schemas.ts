import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as TJS from 'typescript-json-schema';

const filePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(filePath), '..');
const schemaDir = path.join(projectRoot, 'schema');
const configPath = path.join(projectRoot, 'tsconfig.json');

const symbolFileMap = new Map<string, string>([
  ['DocumentModel', 'document-model'],
  ['Block', 'block'],
  ['Edge', 'edge'],
  ['VariableDefinition', 'variable-definition'],
  ['Snippet', 'snippet'],
  ['SnippetVersion', 'snippet-version'],
  ['ExportRecipe', 'export-recipe'],
  ['WorkspaceStatus', 'workspace-status'],
  ['AuditLogEntry', 'audit-log-entry'],
]);

const settings: TJS.PartialArgs = {
  required: true,
  noExtraProps: true,
  topRef: false,
  titles: true,
  aliasRef: true,
};

const generator = (() => {
  const program = TJS.programFromConfig(configPath);
  const built = TJS.buildGenerator(program, settings);
  if (!built) {
    throw new Error('Unable to build JSON schema generator for @moduprompt/types');
  }
  return built;
})();

mkdirSync(schemaDir, { recursive: true });

for (const entry of readdirSync(schemaDir)) {
  if (entry.endsWith('.json')) {
    rmSync(path.join(schemaDir, entry));
  }
}

const aggregateSymbols = Array.from(symbolFileMap.keys());
const aggregateSchema = generator.getSchemaForSymbols(aggregateSymbols);
if (aggregateSchema) {
  aggregateSchema.$id = 'https://schemas.moduprompt.dev/moduprompt.json';
  aggregateSchema.$schema = 'http://json-schema.org/draft-07/schema#';
  aggregateSchema.title = 'ModuPrompt Core Entities';
  writeFileSync(
    path.join(schemaDir, 'moduprompt.json'),
    JSON.stringify(aggregateSchema, null, 2),
    'utf8',
  );
}

for (const [symbol, fileSlug] of symbolFileMap.entries()) {
  const schema = generator.getSchemaForSymbol(symbol);
  if (!schema) {
    throw new Error(`Failed to generate schema for ${symbol}`);
  }
  schema.$id = `https://schemas.moduprompt.dev/${fileSlug}.json`;
  schema.$schema = 'http://json-schema.org/draft-07/schema#';
  schema.title = symbol;
  writeFileSync(
    path.join(schemaDir, `${fileSlug}.json`),
    JSON.stringify(schema, null, 2),
    'utf8',
  );
}

const indexPayload = Object.fromEntries(
  Array.from(symbolFileMap.entries()).map(([symbol, slug]) => [symbol, `./${slug}.json`]),
);
writeFileSync(
  path.join(schemaDir, 'index.json'),
  JSON.stringify(indexPayload, null, 2),
  'utf8',
);
