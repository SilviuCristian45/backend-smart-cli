import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from 'src/utils/ApiResponse';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    // Extragem corpul erorii aruncate de NestJS
    const exceptionResponse = exception.getResponse() as any;

    let messages: string[] = [];

    // Verificăm dacă structura corespunde cu cea generată de ValidationPipe
    if (exceptionResponse && Array.isArray(exceptionResponse.message)) {
      // Erori multiple de validare (class-validator)
      messages = exceptionResponse.message;
    } else if (
      exceptionResponse &&
      typeof exceptionResponse.message === 'string'
    ) {
      // O singură eroare (ex: BadRequestException direct din controller)
      messages = [exceptionResponse.message];
    } else {
      // Fallback în caz că formatul e diferit
      messages = ['A apărut o eroare la validarea datelor.'];
    }

    // Creăm răspunsul standardizat folosind metoda statica `error`
    const standardResponse = ApiResponse.error(messages);

    // Trimitem răspunsul către client
    response.status(status).json(standardResponse);
  }
}
