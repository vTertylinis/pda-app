import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { NavigationEnd, Router, provideRouter, withNavigationErrorHandler } from '@angular/router';
import { filter, take } from 'rxjs';

import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { RetryInterceptor } from './app/interceptors/retry.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    provideRouter(routes, withNavigationErrorHandler(event => {
      window.dispatchEvent(new CustomEvent('app-startup-error', { detail: event.error }));
    })),
    { provide: HTTP_INTERCEPTORS, useClass: RetryInterceptor, multi: true }
  ]
}).then(app => {
  const router = app.injector.get(Router);
  // Bootstrap alone is not enough: the initial lazy route must render too.
  const showApp = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    window.dispatchEvent(new Event('app-startup-ready'));
  }));
  if (router.lastSuccessfulNavigation()) {
    showApp();
  } else {
    router.events.pipe(filter(event => event instanceof NavigationEnd), take(1)).subscribe(showApp);
  }
}).catch(err => {
  window.dispatchEvent(new CustomEvent('app-startup-error', { detail: err }));
  console.error(err);
});
