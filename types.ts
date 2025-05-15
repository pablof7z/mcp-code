/**
 * Database interface that matches our usage patterns with the promisified methods
 */
export interface Database {
  run(sql: string, params?: any[] | any): void;
  prepare(sql: string): Statement;
  transaction(fn: () => void): () => void;
  query(sql: string): {
    all(params?: any): any[];
    get(params?: any): any;
  };
}

/**
 * Statement interface for prepared statements
 */
export interface Statement {
  run(...params: any[]): void;
  finalize(): void;
}

/**
 * Bun type declarations
 */
