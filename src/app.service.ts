import { Injectable, Logger } from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

@Injectable()
export class AppService {
  private logger = new Logger(AppService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  getHello(): string {
    return 'Hello smart cli api';
  }

  public async generateLogsReportJson(logFileName: string, clientId: string) {
    this.logger.log(`Începe procesarea fișierului de loguri: ${logFileName}`);

    const taskId = randomUUID().toString();

    this.eventEmitter.emit('log.uploaded', {
      taskId: taskId,
      filePath: logFileName,
      clientId: clientId,
    });

    return {
      taskId: taskId,
      status: 'PROCESSING',
    };
  }
}
