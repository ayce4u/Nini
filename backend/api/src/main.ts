import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Derrière le reverse proxy de Coolify : on fait confiance à l'adresse du client qu'il transmet.
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Origines autorisées : le site web, et l'app iPhone (Capacitor).
  const origins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:8100,http://localhost:4200'
  )
    .split(',')
    .map((o) => o.trim())
    .concat([
      'capacitor://localhost',
      'ionic://localhost',
      'https://localhost',
    ]);
  app.enableCors({ origin: origins, credentials: true });

  // Vérifie automatiquement les données reçues (formulaires) grâce aux règles des DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.enableShutdownHooks();

  // Documentation interactive de l'API sur /docs.
  const doc = new DocumentBuilder()
    .setTitle('API Ɲini')
    .setDescription(
      'Mise en relation entre clients et prestataires de services au Mali',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, doc),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`API Ɲini prête sur le port ${port}`);
}
await bootstrap();
