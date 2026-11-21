import dotenv from 'dotenv';
import app from './app.js';
import { closeDatabase, initializeDatabase } from './database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  await initializeDatabase();
  const server = app.listen(PORT, () => {
    console.log(`BudgetWise API running on port ${PORT}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((error: unknown) => {
  console.error('Failed to start BudgetWise API:', error);
  process.exitCode = 1;
});
