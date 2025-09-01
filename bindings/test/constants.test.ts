import duckdb from '@rizecom/duckdb-node-bindings';
import { expect, suite, test } from 'vitest';

suite('constants', () => {
  test('sizeof_bool', () => {
    expect(duckdb.sizeof_bool).toBe(1);
  });
  test('library_version', () => {
    // Accept both release and dev variants of 1.4.x
    const v = duckdb.library_version();
    expect(v.startsWith('v1.4.0')).toBe(true);
  });
  test('vector_size', () => {
    expect(duckdb.vector_size()).toBe(2048);
  });
});
