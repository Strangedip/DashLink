import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private isProduction = environment.production;

  log(message: string, ...optionalParams: unknown[]): void {
    if (!this.isProduction) {
      console.log(message, ...optionalParams);
    }
  }

  info(message: string, ...optionalParams: unknown[]): void {
    if (!this.isProduction) {
      console.info(message, ...optionalParams);
    }
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    if (!this.isProduction) {
      console.warn(message, ...optionalParams);
    }
  }

  error(message: string, ...optionalParams: unknown[]): void {
    // Always log errors, even in production
    console.error(message, ...optionalParams);
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    if (!this.isProduction) {
      console.debug(message, ...optionalParams);
    }
  }
}

