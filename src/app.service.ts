import { Injectable, Logger } from '@nestjs/common';

import * as readline from 'node:readline';
import * as fs from 'node:fs';
import { ReportLog } from './model/report-log';
import { Log, LogType } from './model/log';

@Injectable()
export class AppService {
  private logger = new Logger(AppService.name);

  getHello(): string {
    return 'Hello smart cli api';
  }

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

  public async generateLogsReportJson(logFileName: string) {
    this.logger.log(`Începe procesarea fișierului de loguri: ${logFileName}`);

    try {
      const logGenerator = this.parseLogFile(logFileName);

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
        `Se șterge fișierul original (${logFileName}) și se scrie raportul...`,
      );

      fs.unlinkSync(logFileName);
      fs.writeFileSync('report.json', JSON.stringify(reportLog, null, 2));

      this.logger.log('Raportul JSON a fost generat și salvat cu succes!');

      return reportLog;
    } catch (error) {
      // Captăm și afișăm eroarea, inclusiv stack trace-ul pentru un debug mai ușor
      this.logger.error(
        `Eroare la generarea raportului pentru fișierul ${logFileName}: ${error.message}`,
        error.stack,
      );

      // Aruncăm eroarea mai departe pentru a putea fi interceptată de controller sau de Exception Filter
      throw error;
    }
  }
}
