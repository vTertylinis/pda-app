import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap } from 'rxjs/operators';

@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  // how many times to retry
  private readonly maxRetries = 3;

  // base delay in ms (will back off exponentially)
  private readonly scalingDuration = 1000;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error, retryCount) => {
            if (
              retryCount < this.maxRetries &&
              error instanceof HttpErrorResponse &&
              (error.status === 0 || error.status >= 500) // network/server errors
            ) {
              const backoffTime = (retryCount + 1) * this.scalingDuration;
              console.warn(
                `Retrying request ${req.url} (attempt #${retryCount + 1}) after ${backoffTime}ms`
              );
              return timer(backoffTime);
            }
            return throwError(() => error);
          })
        )
      )
    );
  }
}
