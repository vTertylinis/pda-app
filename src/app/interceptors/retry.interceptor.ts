import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, TimeoutError, timer } from 'rxjs';
import { retry, timeout } from 'rxjs/operators';

@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  private readonly maxRetries = 2;
  private readonly scalingDuration = 1500;
  private readonly requestTimeout = 15000;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isSafeToRetry = req.method === 'GET' || req.method === 'HEAD';

    return next.handle(req).pipe(
      timeout(this.requestTimeout),
      retry({
        count: isSafeToRetry ? this.maxRetries : 0,
        delay: (error, retryCount) => {
          if (
            error instanceof TimeoutError ||
            (error instanceof HttpErrorResponse &&
              (error.status === 0 || error.status >= 500))
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
