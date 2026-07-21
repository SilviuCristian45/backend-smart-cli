import {
  BadRequestException,
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
        filename: (req, file, callback) => {
          const ext = extname(file.originalname);
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      ApiResponse.error('Nu ati specificat fisierul');
    }
    try {
      return ApiResponse.success(
        await this.appService.generateLogsReportJson(file.path),
      );
    } catch (err) {
      return ApiResponse.error('Eroare la generarea raportului');
    }
  }
}
