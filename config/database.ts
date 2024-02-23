import knex, { Knex } from 'knex';

class Database {
  private static instance: Database;
  private _db: Knex;

  constructor() {
    this._db = knex({
      client: 'pg',
      connection: 'postgresql://SpexID:lmaQSx5y4NuC@ep-holy-math-a1efekeu-pooler.ap-southeast-1.aws.neon.tech/Tripseldb?sslmode=require',
      searchPath: ['public'],
    });

    // Test the database connection
    this._db.raw('SELECT 1')
      .then(() => {
        console.log('Database connected successfully');

        // Check if the "users" table exists
        return this._db.schema.hasTable('users');
      })
      .then((exists) => {
        if (exists) {
          console.log('Table "users" exists');

          // Perform a SELECT query on the "users" table
          return this._db.raw('SELECT * FROM users');
        } else {
          console.log('Table "users" does not exist');
        }
      })
      .then((result) => {
        if (result) {
          console.log('Data from "users" table:', result);
        }
      })
      .catch((error) => {
        console.error('Error connecting to the database:', error);
      });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  get db(): Knex {
    return this._db;
  }
}

export default Database.getInstance().db;
