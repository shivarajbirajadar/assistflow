import { env, connectDB } from './src/config/index.js';
import { registerListeners } from './src/core/events.js';
import app from './src/app.js';

const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('Check: 1) MONGODB_URI in .env  2) database user password  3) Atlas Network Access has 0.0.0.0/0');
    process.exit(1);
  }

  registerListeners();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start();