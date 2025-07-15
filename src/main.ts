import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'], // Activer tous les niveaux de log
  });
  
  // Configurer CORS
  app.enableCors({
    origin: true, // Autoriser toutes les origines en développement
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // Configurer les timeouts pour les requêtes HTTP - Augmenter à 120 secondes
  app.use((req, res, next) => {
    req.setTimeout(120000);
    res.setTimeout(120000);
    next();
  });
  
  // Configurer Swagger
  const config = new DocumentBuilder()
    .setTitle('Y-Nkap API')
    .setDescription('API documentation for Y-Nkap')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  // Configurer les pipes et filtres globaux
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Démarrer l'application
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
