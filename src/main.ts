import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import * as mongoose from 'mongoose';

async function bootstrap() {
  // Configurer MongoDB pour permettre le tri externe
  mongoose.set('setDefaultsOnInsert', true);
  
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Y-nkap API Documentation')
    .setDescription('Plateforme de paiement en ligne')
    .setVersion('2.0')
    .addTag('Y-Nkap')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(3000);
  console.log(`application fonctionne sous: ${await app.getUrl()}`);
}
bootstrap();
