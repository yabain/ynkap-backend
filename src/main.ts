import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {

  // const httpsOptions = {
  //   key: fs.readFileSync('./secrets/cert.key'),
  //   cert: fs.readFileSync('./secrets/cert.crt'),
  // }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    
    // httpsOptions
  });

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Supprime automatiquement les propriétés non spécifiées dans le DTO, ce qui aide à éviter la pollution des donnés  
    forbidNonWhitelisted: true, // Lève une erreur si des propriétés non spécifiées sont présentes dans l'objet de la requête
    transform: true, // Transforme le payload de la requête en instance de classe DTO, permettant ainsi la validation de types plus complexes
  }));

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors();
  
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // Configuration des timeouts avec gestion d'erreur
  app.use((req, res, next) => {
    const timeout = parseInt(process.env.REQUEST_TIMEOUT || '120000');
    req.setTimeout(timeout, () => {
      res.status(408).json({ message: 'Request timeout' });
    });
    res.setTimeout(timeout);
    next();
  });
  
  // Middleware de sécurité
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
  
  // Configurer Swagger
  const config = new DocumentBuilder()
    .setTitle('Y-Nkap API')
    .setDescription('API documentation for Y-Nkap')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  // Configurer les pipes et filtres globaux
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Démarrer l'application
  const port = process.env.PORT || 3010;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
