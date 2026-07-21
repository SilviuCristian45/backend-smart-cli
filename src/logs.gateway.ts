import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

// cors: true este esențial pentru a permite React-ului (care rulează pe alt port/domeniu) să se conecteze
@WebSocketGateway({ cors: true })
export class LogsGateway {
  private logger = new Logger(LogsGateway.name);

  @WebSocketServer()
  server: Server;

  // Această funcție va fi apelată de Worker-ul tău la final
  notifyClient(clientId: string, eventName: string, data: any) {
    // Trimitem datele STRICT către clientul care a cerut raportul
    this.logger.log(
      'message sent to ' +
        clientId +
        ' on event name ' +
        eventName +
        ' with data ' +
        JSON.stringify(data),
    );
    this.server.to(clientId).emit(eventName, data);
  }
}
