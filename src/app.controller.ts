import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiResponse } from './utils/ApiResponse';
import { randomUUID } from 'crypto'; // <-- Folosim modulul nativ Node.js

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024,
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(log)$/i)) {
          return callback(
            new BadRequestException(
              'Invalid file type. Only .log files are permitted.',
            ),
            false,
          );
        }
        callback(null, true);
      },
      storage: diskStorage({
        destination: process.env.LOG_DEST ?? 'logs',
        filename: (req, file, cb) => {
          // 1. Generăm un ID unic: ex. "550e8400-e29b-41d4-a716-446655440000"
          const uniqueId = randomUUID();

          // 2. Extragem extensia originală: ex. ".log"
          const extension = extname(file.originalname);

          // 3. Lipim ID-ul de extensie: "550e8400-e29b-41d4-a716-446655440000.log"
          cb(null, `${uniqueId}${extension}`);
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('clientId') clientId: string,
  ) {
    if (!file) {
      ApiResponse.error('Nu ati specificat fisierul');
    }
    try {
      return ApiResponse.success(
        await this.appService.generateLogsReportJson(file.path, clientId),
      );
    } catch (err) {
      return ApiResponse.error('Eroare la generarea raportului');
    }
  }
}
