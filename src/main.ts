import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('HTTP');

  app.use((req: any, res: any, next: any) => {
    res.on('finish', () => {
      const auth = req.headers.authorization ? '✓' : '✗';
      logger.log(`${req.method} ${req.url} → ${res.statusCode} [auth:${auth}]`);
    });
    next();
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`FinQuest API running on http://localhost:${port}/api`);
}

bootstrap();
