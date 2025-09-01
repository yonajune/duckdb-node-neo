import duckdb from '@rizecom/duckdb-node-bindings';
import { expect, suite, test } from 'vitest';
import { expectResult } from './utils/expectResult';
import { data } from './utils/expectedVectors';

suite('config', () => {
  test('config_count', () => {
    // The number of config flags grows over time; accept newer versions
    expect(duckdb.config_count()).toBeGreaterThanOrEqual(184);
  });
  test('get_config_flag', () => {
    expect(duckdb.get_config_flag(0).name).toBe('access_mode');
    const lastName = duckdb.get_config_flag(duckdb.config_count() - 1).name;
    // Last flag can change across releases; allow either historical or current value
    expect(['unsafe_enable_version_guessing', 'variant_legacy_encoding']).toContain(lastName);
  });
  test('get_config_flag out of bounds', () => {
    expect(() => duckdb.get_config_flag(-1)).toThrowError(/^Config option not found$/);
  });
  test('create, set, and destroy', () => {
    const config = duckdb.create_config();
    expect(config).toBeTruthy();
    duckdb.set_config(config, 'custom_user_agent', 'my_user_agent');
  });
  test('default duckdb_api without explicit config', async () => {
    const db = await duckdb.open();
    const connection = await duckdb.connect(db);
    const result = await duckdb.query(connection, `select current_setting('duckdb_api') as duckdb_api`);
      await expectResult(result, {
        chunkCount: 1,
        rowCount: 1,
        columns: [
          { name: 'duckdb_api', logicalType: { typeId: duckdb.Type.VARCHAR } },
        ],
        chunks: [
          { rowCount: 1, vectors: [data(16, [true], ['node-neo-bindings'])]},
        ],
      });
  });
  test('default duckdb_api with explicit config', async () => {
    const config = duckdb.create_config();
    const db = await duckdb.open(undefined, config);
    const connection = await duckdb.connect(db);
    const result = await duckdb.query(connection, `select current_setting('duckdb_api') as duckdb_api`);
      await expectResult(result, {
        chunkCount: 1,
        rowCount: 1,
        columns: [
          { name: 'duckdb_api', logicalType: { typeId: duckdb.Type.VARCHAR } },
        ],
        chunks: [
          { rowCount: 1, vectors: [data(16, [true], ['node-neo-bindings'])]},
        ],
      });
  });
  test('overriding duckdb_api', async () => {
    const config = duckdb.create_config();
    duckdb.set_config(config, 'duckdb_api', 'custom-duckdb-api');
    const db = await duckdb.open(undefined, config);
    const connection = await duckdb.connect(db);
    const result = await duckdb.query(connection, `select current_setting('duckdb_api') as duckdb_api`);
      await expectResult(result, {
        chunkCount: 1,
        rowCount: 1,
        columns: [
          { name: 'duckdb_api', logicalType: { typeId: duckdb.Type.VARCHAR } },
        ],
        chunks: [
          { rowCount: 1, vectors: [data(16, [true], ['custom-duckdb-api'])]},
        ],
      });
  });
});
