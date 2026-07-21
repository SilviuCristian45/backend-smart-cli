export type LogType = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'LOG';

function isValidLogLevel(value: string): value is LogType {
  return (
    value === 'LOG' ||
    value === 'ERROR' ||
    value === 'WARN' ||
    value === 'INFO' ||
    value == 'DEBUG'
  );
}

export class Log {
  private logType: LogType;
  private date: Date;
  private message: string;
  private json: string;
  private originalHour: number;

  constructor(
    logType: LogType,
    date: Date,
    message: string,
    json: string,
    originalHour: number,
  ) {
    this.logType = logType;
    this.date = date;
    this.message = message;
    this.json = json;
    this.originalHour = originalHour;
  }

  getMessage() {
    return this.message;
  }

  getDate() {
    return this.date;
  }

  getOriginalHour() {
    return this.originalHour;
  }

  public getLogType() {
    return this.logType;
  }

  static cheeryPick(data: string): Log | null {
    try {
      const logElements = data.split(' ');
      //console.log(logElements);

      const logType = logElements[0].replace('[', '').replace(']', '');

      if (isValidLogLevel(logType) === false) {
        console.error('log type not valid , must be one of these values ');
        return null;
      }

      const logDate = new Date(logElements[1]);

      if (!logDate || isNaN(logDate.getTime())) {
        console.error('log date not found, must be mentioned, skip line', data);
        console.error(data);
        console.error('date in ms', logDate.getTime());
        return null;
      }

      const hourString = logElements[1].substring(11, 13);
      const originalHour = parseInt(hourString, 10);

      const firstMinus = data.indexOf(' - ');
      const firstJsonBracket = data.indexOf('{');
      const lastJsonBracker = data.lastIndexOf('}');

      const logMessage = data.slice(firstMinus + 2, firstJsonBracket);

      if (!logMessage) {
        console.error('log message not mentioned, or format incorrect');
        return null;
      }

      const jsonDetails = data.slice(firstJsonBracket, lastJsonBracker + 1);

      if (!jsonDetails) {
        console.error('no json details in line, ', data);
        return null;
      }
      return new Log(
        logType as LogType,
        logDate,
        logMessage,
        jsonDetails,
        originalHour,
      );
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}
