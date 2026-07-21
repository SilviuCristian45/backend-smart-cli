// Definim tipurile posibile pentru răspuns
export type ResponseType = 'SUCCESS' | 'WARN' | 'ERROR';

export class ApiResponse<T> {
  responseType: ResponseType;
  messages: string[];
  data: T | null;

  // Constructorul este privat pentru a forța folosirea metodelor statice
  private constructor(
    responseType: ResponseType,
    messages: string[],
    data: T | null,
  ) {
    this.responseType = responseType;
    this.messages = messages;
    this.data = data;
  }

  /**
   * Returnează un răspuns de succes.
   * @param data Datele care trebuie returnate.
   * @param messages Mesaje opționale de succes (default: array gol).
   */
  static success<T>(data: T, messages: string[] = []): ApiResponse<T> {
    return new ApiResponse<T>('SUCCESS', messages, data);
  }

  /**
   * Returnează un răspuns cu avertismente.
   * @param messages Mesajele de avertizare.
   * @param data Date opționale (default: null).
   */
  static warn<T>(messages: string[], data: T | null = null): ApiResponse<T> {
    return new ApiResponse<T>('WARN', messages, data);
  }

  /**
   * Returnează un răspuns de eroare.
   * @param messages Mesajele de eroare.
   * @param data Date opționale (default: null).
   */
  static error<T>(
    messages: string[] | string,
    data: T | null = null,
  ): ApiResponse<T> {
    return new ApiResponse<T>(
      'ERROR',
      Array.isArray(messages) ? messages : [messages],
      data,
    );
  }
}
