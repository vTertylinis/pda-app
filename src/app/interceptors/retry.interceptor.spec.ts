import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { defer, throwError } from 'rxjs';
import { RetryInterceptor } from './retry.interceptor';

describe('Safe HTTP retries', () => {
  afterEach(() => vi.useRealTimers());
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    it(`never retries ${method} after a lost response or server error`, () => {
      for (const status of [0, 500]) {
        let attempts = 0;
        const handler = { handle: () => defer(() => {
          attempts++;
          return throwError(() => new HttpErrorResponse({ status }));
        }) };
        new RetryInterceptor().intercept(new HttpRequest(method, '/fixture', {}), handler)
          .subscribe({ error: error => expect(error.status).toBe(status) });
        expect(attempts).toBe(1);
      }
    });
  }
  for (const method of ['GET', 'HEAD'] as const) {
    it(`retries ${method} only a bounded number of times`, async () => {
      vi.useFakeTimers();
      let attempts = 0;
      const handler = { handle: () => defer(() => {
        attempts++;
        return throwError(() => new HttpErrorResponse({ status: 503 }));
      }) };
      new RetryInterceptor().intercept(new HttpRequest(method, '/fixture'), handler)
        .subscribe({ error: error => expect(error.status).toBe(503) });
      await vi.runAllTimersAsync();
      expect(attempts).toBe(3);
    });
  }
  it('does not retry a conflicting GET', () => {
    let attempts = 0;
    const handler = { handle: () => defer(() => {
      attempts++;
      return throwError(() => new HttpErrorResponse({ status: 409 }));
    }) };
    new RetryInterceptor().intercept(new HttpRequest('GET', '/fixture'), handler)
      .subscribe({ error: error => expect(error.status).toBe(409) });
    expect(attempts).toBe(1);
  });
});
