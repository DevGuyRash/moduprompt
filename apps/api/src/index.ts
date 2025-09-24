import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';

const start = async () => {
  const env = loadEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
