import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter'; // Import nou
import { LogsProcessor } from './log.processor';
import { LogsGateway } from './logs.gateway';

@Module({
  imports: [
    ConfigModule.forRoot(),
    EventEmitterModule.forRoot(), // Îl activezi pur și simplu aici
  ],
  controllers: [AppController],
  providers: [AppService, LogsProcessor, LogsGateway],
})
export class AppModule {}
