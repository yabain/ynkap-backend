import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import * as fs from 'fs';

async function bootstrap() {

  // const httpsOptions = {
  //   key: fs.readFileSync('./secrets/cert.key'),
  //   cert: fs.readFileSync('./secrets/cert.crt'),
  // }
  const app = await NestFactory.create(AppModule, {
    // httpsOptions
  });

  app.enableCors();
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
