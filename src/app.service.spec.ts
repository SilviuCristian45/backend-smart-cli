import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import * as fs from 'node:fs';

// 1. Spunem lui Jest să intercepteze toate apelurile către 'node:fs'
jest.mock('node:fs');

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    // Curățăm mock-urile după fiecare test pentru a nu se contamina între ele
    jest.clearAllMocks();
  });

  it('ar trebui să calculeze corect statisticile, să șteargă logul și să scrie raportul', async () => {
    const testFileName = 'test-log.txt';

    // 2. Simulam metoda privată parseLogFile
    // Folosim "as any" pentru a face bypass la restricția de vizibilitate `private` din TypeScript
    jest
      .spyOn(service as any, 'parseLogFile')
      .mockImplementation(async function* () {
        // Simulam un flux de loguri deja parsat (evităm astfel și readline-ul)
        yield {
          getLogType: () => 'INFO',
          getOriginalHour: () => 9,
          getMessage: () => 'App started',
        };
        yield {
          getLogType: () => 'ERROR',
          getOriginalHour: () => 10,
          getMessage: () => 'DB connection lost',
        };
        yield {
          getLogType: () => 'ERROR',
          getOriginalHour: () => 10,
          getMessage: () => 'DB connection lost',
        }; // Duplicat intenționat
        yield {
          getLogType: () => 'ERROR',
          getOriginalHour: () => 11,
          getMessage: () => 'Timeout',
        };
        yield {
          getLogType: () => 'WARN',
          getOriginalHour: () => 11,
          getMessage: () => 'High memory usage',
        };
      });

    // 3. Apelăm metoda pe care o testăm
    const result = await service.generateLogsReportJson(testFileName);

    // 4. Verificăm calculele (Asserts)
    // - Total erori: 3, Info: 1, Warn: 1
    expect(result.totalLogs['ERROR']).toBe(3);
    expect(result.totalLogs['INFO']).toBe(1);
    expect(result.totalLogs['WARN']).toBe(1);

    // - Ora cu cele mai multe erori trebuie să fie 10 (cu 2 erori)
    expect(result.hourWithMostErrors.hour).toBe(10);
    expect(result.hourWithMostErrors.errors).toBe(2);

    // - Mesajele unice de eroare trebuie să fie exact 2 (duplicatul "DB connection lost" e ignorat)
    expect(result.uniqueMessages).toEqual(['DB connection lost', 'Timeout']);

    // 5. Verificăm interacțiunea cu sistemul de fișiere
    expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    expect(fs.unlinkSync).toHaveBeenCalledWith(testFileName);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'report.json',
      expect.any(String), // Verificăm doar că trimitem un string; opțional putem verifica exact JSON-ul
    );
  });

  it('ar trebui să genereze raportul corect chiar dacă nu există loguri de tip ERROR', async () => {
    const testFileName = 'clean-log.txt';

    // Simulam un fișier care conține doar INFO și DEBUG
    jest
      .spyOn(service as any, 'parseLogFile')
      .mockImplementation(async function* () {
        yield {
          getLogType: () => 'INFO',
          getOriginalHour: () => 8,
          getMessage: () => 'App started',
        };
        yield {
          getLogType: () => 'DEBUG',
          getOriginalHour: () => 9,
          getMessage: () => 'Checking config',
        };
      });

    const result = await service.generateLogsReportJson(testFileName);

    // Verificăm statisticile
    expect(result.totalLogs['INFO']).toBe(1);
    expect(result.totalLogs['DEBUG']).toBe(1);
    expect(result.totalLogs['ERROR']).toBe(0); // 0 erori

    // Ora cu maxime erori ar trebui să rămână la valorile inițiale (0)
    expect(result.hourWithMostErrors.hour).toBe(0);
    expect(result.hourWithMostErrors.errors).toBe(0);

    // Mesajele unice de eroare ar trebui să fie un array gol
    expect(result.uniqueMessages).toEqual([]);

    // Ne asigurăm că fluxul de scriere pe disc a continuat normal
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('ar trebui să arunce o eroare dacă scrierea fișierului eșuează', async () => {
    const testFileName = 'test-log.txt';

    // Generăm un log gol pentru a trece repede de bucla `for await`
    jest
      .spyOn(service as any, 'parseLogFile')
      .mockImplementation(async function* () {
        yield {
          getLogType: () => 'INFO',
          getOriginalHour: () => 9,
          getMessage: () => 'Test',
        };
      });

    // Forțăm `writeFileSync` să arunce o eroare
    const errorMessage = 'Disk is full';
    (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error(errorMessage);
    });

    // Verificăm dacă metoda noastră captează și aruncă eroarea mai departe
    await expect(service.generateLogsReportJson(testFileName)).rejects.toThrow(
      errorMessage,
    );

    // Asigurăm-ne că s-a încercat ștergerea fișierului înainte de a eșua la scriere
    expect(fs.unlinkSync).toHaveBeenCalledWith(testFileName);
  });
});
