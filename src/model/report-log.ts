import { LogType } from './log';

export class ReportLog {
  constructor(
    public totalLogs: Record<LogType, number>,
    public hourWithMostErrors: { hour: number; errors: number },
    public uniqueMessages: Array<string>,
  ) {}
}
