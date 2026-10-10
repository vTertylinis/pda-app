import { DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, defer, finalize } from 'rxjs';
import { environment } from '../../environments/environment';

// Browser extensions inject their own scripts/styles into the live DOM.
// Those assets are not part of the deployed build and must not trigger upgrades.
export function captureAppBuildVersion(doc: Document): string | null {
  const appAssets = (selector: string, attribute: string, kind: string) =>
    Array.from(doc.querySelectorAll(selector), node => node.getAttribute(attribute))
      .filter((value): value is string => !!value &&
        !/^(?:chrome|moz|safari|safari-web|ms-browser)-extension:/i.test(value))
      .map(value => `${kind}:${value}`);
  const assets = [
    ...appAssets('script[src]', 'src', 'script'),
    ...appAssets('link[rel="stylesheet"][href]', 'href', 'style')
  ].sort();
  return assets.length ? JSON.stringify(assets) : null;
}

export const APP_UPDATE_RUNTIME = new InjectionToken('App update runtime', {
  providedIn: 'root', factory: () => {
    return {
      version: environment.production ? captureAppBuildVersion(document) : null,
      busy: () => !!document.querySelector('dialog[open], ion-modal, ion-alert, ion-action-sheet, ion-popover'),
      reload: () => window.location.reload()
    };
  }
});

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private runtime = inject(APP_UPDATE_RUNTIME);
  private destroyRef = inject(DestroyRef);
  private writes = 0;
  private pending = false;
  private reloading = false;
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    this.destroyRef.onDestroy(() => { if (this.timer) clearInterval(this.timer); });
  }

  checkVersion(version?: string | null) {
    if (version && this.runtime.version && version !== this.runtime.version) this.requestReload();
  }

  requestReload() {
    if (this.pending || this.reloading) return;
    this.pending = true;
    // Defer at least one tick so modal dismissal can hand off to its HTTP write.
    this.timer = setInterval(() => {
      if (this.writes || this.runtime.busy() || document.visibilityState !== 'visible') return;
      this.reloading = true;
      clearInterval(this.timer);
      this.timer = undefined;
      this.runtime.reload();
    }, 500);
  }

  trackWrite<T>(request: Observable<T>): Observable<T> {
    return defer(() => {
      this.writes++;
      return request.pipe(finalize(() => { this.writes--; }));
    });
  }
}
