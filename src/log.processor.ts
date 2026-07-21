// Șterge importurile de la '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import { ReportLog } from './model/report-log';
import { Log, LogType } from './model/log';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter } from 'node:stream';
import { LogsGateway } from './logs.gateway';

@Injectable() // <-- Folosește Injectable, NU @Processor('logs-queue')
export class LogsProcessor {
  private logger = new Logger(LogsProcessor.name);

  constructor(private readonly logsGateway: LogsGateway) {}

  private async *parseLogFile(filePath: string): AsyncGenerator<Log> {
    const file = readline.createInterface({
      input: fs.createReadStream(filePath),
      output: process.stdout,
      terminal: false,
    });

    for await (const line of file) {
      // Each line in input.txt will be successively available here as `line`.
      //verifiy if line is correct format, if not
      const log = Log.cheeryPick(line);
      if (log !== null) yield log;
    }
  }

  @OnEvent('log.uploaded', { async: true }) // <-- Ascultătorul de eveniment
  async handleLogProcessing(payload: {
    taskId: string;
    filePath: string;
    clientId: string;
  }) {
    const { taskId, filePath, clientId } = payload;
    try {
      const logGenerator = this.parseLogFile(filePath);

      const totalCountStatsPerLogType: Record<LogType, number> = {
        INFO: 0,
        WARN: 0,
        ERROR: 0,
        DEBUG: 0,
        LOG: 0,
      };

      const hourWithErrors: Map<number, number> = new Map();
      const uniqueMessages: Set<string> = new Set();

      this.logger.debug('Se extrag și se procesează liniile din fișier...');

      for await (const log of logGenerator) {
        totalCountStatsPerLogType[log.getLogType()] += 1;

        if (log.getLogType() === 'ERROR') {
          const currentHour = log.getOriginalHour();
          const currentErrors = hourWithErrors.get(currentHour) || 0;
          hourWithErrors.set(currentHour, currentErrors + 1);

          if (uniqueMessages.has(log.getMessage()) === false) {
            uniqueMessages.add(log.getMessage());
          }
        }
      }

      this.logger.debug(
        'Parsare finalizată. Se determină ora cu cele mai multe erori...',
      );

      let maxHour = 0;
      let maxErrors = 0;
      for (const [key, val] of hourWithErrors) {
        if (val > maxErrors) {
          maxErrors = val;
          maxHour = key;
        }
      }

      const reportLog = new ReportLog(
        totalCountStatsPerLogType,
        { hour: maxHour, errors: maxErrors },
        [...uniqueMessages],
      );

      this.logger.debug(
        `Se șterge fișierul original (${filePath}) și se scrie raportul...`,
      );

      fs.unlinkSync(filePath);
      fs.writeFileSync('report.json', JSON.stringify(reportLog, null, 2));

      this.logger.log(
        'Raportul JSON a fost generat și salvat cu succes! catre ' + clientId,
      );

      this.logsGateway.notifyClient(clientId, 'report_ready', reportLog);

      return reportLog;
    } catch (error) {
      // Captăm și afișăm eroarea, inclusiv stack trace-ul pentru un debug mai ușor
      this.logger.error(
        `Eroare la generarea raportului pentru fișierul ${filePath}: ${error.message}`,
        error.stack,
      );

      this.logsGateway.notifyClient(clientId, 'report_error', {
        message: `generarea raportului a esuat ${taskId}`,
      });

      // Aruncăm eroarea mai departe pentru a putea fi interceptată de controller sau de Exception Filter
      throw error;
    }
  }
}
