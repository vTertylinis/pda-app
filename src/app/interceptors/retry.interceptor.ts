import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { retry, timeout } from 'rxjs/operators';

@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  private readonly maxRetries = 2;
  private readonly scalingDuration = 1500;
  private readonly requestTimeout = 15000;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      timeout(this.requestTimeout),
      retry({
        count: this.maxRetries,
        delay: (error, retryCount) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 0 || error.status >= 500)
          ) {
            const backoffTime = retryCount * this.scalingDuration;
            console.warn(
              `Retrying request ${req.url} (attempt #${retryCount}) after ${backoffTime}ms`
            );
            return timer(backoffTime);
          }
          throw error;
        }
      })
    );
  }
}
