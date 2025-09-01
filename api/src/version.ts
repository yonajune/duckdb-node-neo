import duckdb from '@rizecom/duckdb-node-bindings';

export function version(): string {
  return duckdb.library_version();
}
