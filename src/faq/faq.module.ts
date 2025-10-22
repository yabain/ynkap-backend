import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FAQ, FAQSchema } from './models/faq.schema';
import { FAQController } from './controllers/faq.controller';
import { FAQService } from './services/faq.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FAQ.name, schema: FAQSchema }
    ])
  ],
  controllers: [FAQController],
  providers: [FAQService],
  exports: [FAQService] // Export the service so other modules can use it
})
export class FAQModule {}