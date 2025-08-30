import duckdb from '@rizecom/node-bindings';

export function version(): string {
  return duckdb.library_version();
}
