import duckdb from '@rizecom/node-bindings';
import { createConfig } from './createConfig';
import { DuckDBConnection } from './DuckDBConnection';
import { DuckDBInstanceCache } from './DuckDBInstanceCache';

export class DuckDBInstance {
  private readonly db: duckdb.Database;

  constructor(db: duckdb.Database) {
    this.db = db;
  }

  public static async create(
    path?: string,
    options?: Record<string, string>
  ): Promise<DuckDBInstance> {
    const config = createConfig(options);
    return new DuckDBInstance(await duckdb.open(path, config));
  }

  public static async fromCache(
    path?: string,
    options?: Record<string, string>
  ): Promise<DuckDBInstance> {
    return DuckDBInstanceCache.singleton.getOrCreateInstance(path, options);
  }

  public async connect(): Promise<DuckDBConnection> {
    return new DuckDBConnection(await duckdb.connect(this.db));
  }

  public closeSync() {
    duckdb.close_sync(this.db);
  }
}
