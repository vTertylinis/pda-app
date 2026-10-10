import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_UPDATE_RUNTIME, AppUpdateService, captureAppBuildVersion } from './app-update.service';

describe('Safe application upgrades', () => {
  let service: AppUpdateService;
  let runtime: { version: string; busy: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    runtime = { version: 'loaded-build', busy: vi.fn().mockReturnValue(false), reload: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: APP_UPDATE_RUNTIME, useValue: runtime }] });
    service = TestBed.inject(AppUpdateService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('detects missed deployments on reconnect, but ignores unchanged and missing versions', () => {
    service.checkVersion('loaded-build');
    service.checkVersion(null);
    vi.advanceTimersByTime(1000);
    expect(runtime.reload).not.toHaveBeenCalled();
    service.checkVersion('deployed-build');
    service.checkVersion('deployed-build');
    vi.advanceTimersByTime(1000);
    expect(runtime.reload).toHaveBeenCalledTimes(1);
  });
  it('waits for a modal to close and its resulting write to finish', () => {
    runtime.busy.mockReturnValue(true);
    service.requestReload();
    vi.advanceTimersByTime(500);
    const write = new Subject<void>();
    service.trackWrite(write).subscribe();
    runtime.busy.mockReturnValue(false);
    vi.advanceTimersByTime(500);
    expect(runtime.reload).not.toHaveBeenCalled();
    write.complete();
    vi.advanceTimersByTime(500);
    expect(runtime.reload).toHaveBeenCalledTimes(1);
  });
  it('also waits for all concurrent writes and releases failed or cancelled requests', () => {
    const first = new Subject<void>();
    const second = new Subject<void>();
    const subscription = service.trackWrite(first).subscribe();
    service.trackWrite(second).subscribe();
    service.trackWrite(throwError(() => new Error('failed'))).subscribe({ error: () => {} });
    service.requestReload();
    subscription.unsubscribe();
    vi.advanceTimersByTime(500);
    expect(runtime.reload).not.toHaveBeenCalled();
    second.complete();
    vi.advanceTimersByTime(500);
    expect(runtime.reload).toHaveBeenCalledTimes(1);
  });
  it('does not reload a background device until it becomes visible', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    service.requestReload();
    vi.advanceTimersByTime(500);
    expect(runtime.reload).not.toHaveBeenCalled();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.advanceTimersByTime(500);
    expect(runtime.reload).toHaveBeenCalledTimes(1);
  });
});


describe('Build version capture with browser extensions', () => {
  it('ignores injected extension scripts and styles without ignoring actual build changes', () => {
    const doc = document.implementation.createHTMLDocument('Version test');
    doc.body.innerHTML = '<script src="main-a.js"></script><link rel="stylesheet" href="styles-a.css">';
    const original = captureAppBuildVersion(doc);
    expect(original).toBe(JSON.stringify(['script:main-a.js', 'style:styles-a.css']));
    for (const protocol of ['chrome-extension', 'moz-extension', 'safari-web-extension']) {
      const script = doc.createElement('script');
      script.src = protocol + '://extension/injected.js';
      doc.head.prepend(script);
      const style = doc.createElement('link');
      style.rel = 'stylesheet';
      style.href = protocol + '://extension/injected.css';
      doc.head.prepend(style);
    }
    expect(captureAppBuildVersion(doc)).toBe(original);
    doc.querySelector('script[src="main-a.js"]')!.setAttribute('src', 'main-b.js');
    expect(captureAppBuildVersion(doc)).not.toBe(original);
  });
});
