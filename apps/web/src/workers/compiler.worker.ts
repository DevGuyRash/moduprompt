import { createDefaultFilters, createDefaultFormatters, registerCompilerWorker } from '@moduprompt/compiler';

registerCompilerWorker({
  filters: createDefaultFilters(),
  formatters: createDefaultFormatters(),
});
