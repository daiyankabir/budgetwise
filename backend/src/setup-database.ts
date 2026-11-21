import { closeDatabase, initializeDatabase } from './database.js';

initializeDatabase()
  .then(closeDatabase)
  .catch((error: unknown) => {
    console.error('Failed to initialize database:', error);
    process.exitCode = 1;
  });
