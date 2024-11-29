import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
// import * as fs from 'fs';

async function bootstrap() {

  // const httpsOptions = {
  //   key: fs.readFileSync('./secrets/cert.key'),
  //   cert: fs.readFileSync('./secrets/cert.crt'),
  // }
  const app = await NestFactory.create(AppModule, {
    // httpsOptions
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Supprime automatiquement les propriétés non spécifiées dans le DTO, ce qui aide à éviter la pollution des donnés  
    forbidNonWhitelisted: true, // Lève une erreur si des propriétés non spécifiées sont présentes dans l'objet de la requête
    transform: true, // Transforme le payload de la requête en instance de classe DTO, permettant ainsi la validation de types plus complexes
  }));

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Y-nkap API Documentation')
    .setDescription('Plateforme de paiement en ligne')
    .setVersion('1.0')
    .addTag('Y-Nkap')
    .build();

    const document = SwaggerModule.createDocument(app,config)
    SwaggerModule.setup('api', app, document)
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
