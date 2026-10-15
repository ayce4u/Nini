import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/** Service de notifications : lit la file Redis et envoie SMS, WhatsApp et notifications iPhone. */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`Service de notifications Ɲini prêt sur le port ${port}`);
}
await bootstrap();
