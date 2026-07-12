import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

interface CartRequestContext {
  requestId: string;
  tableId: string;
  url: string;
  startedAt: string;
  startedAtMs: number;
}

interface NetworkDiagnostic extends Record<string, unknown> {
  eventId: string;
}

@Injectable({ providedIn: 'root' })
export class NetworkDiagnosticsService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'pda-network-diagnostics-v1';
  private readonly appInstanceKey = 'pda-app-instance-id';
  private readonly maxStoredEntries = 100;
  private readonly uploadUrl = `${environment.apiUrl}/client-diagnostics`;
  private memoryQueue: NetworkDiagnostic[] = [];
  private uploading = false;
  private retryTimer: ReturnType<typeof setInterval>;

  constructor() {
    window.addEventListener('online', () => this.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.flush();
      }
    });

    // `online` is not reliable during a mesh hand-off: the phone can remain
    // connected to Wi-Fi while the local server is temporarily unreachable.
    // Periodically trying the upload is therefore more useful than relying on
    // the browser event alone.
    this.retryTimer = setInterval(() => this.flush(), 15_000);
    this.flush();
  }

  createCartRequest(tableId: unknown, url: string): CartRequestContext {
    return {
      requestId: this.newId(),
      tableId: String(tableId),
      url,
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
    };
  }

  recordCartFailure(context: CartRequestContext, error: unknown): void {
    const httpError = error instanceof HttpErrorResponse ? error : null;
    const connection = (navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        type?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    }).connection;

    const diagnostic: NetworkDiagnostic = {
      eventId: this.newId(),
      type: 'get-cart-failure',
      recordedAt: new Date().toISOString(),
      appInstanceId: this.getAppInstanceId(),
      requestId: context.requestId,
      request: {
        method: 'GET',
        url: context.url,
        tableId: context.tableId,
        startedAt: context.startedAt,
        durationMs: Date.now() - context.startedAtMs,
      },
      error: {
        kind: httpError ? 'HttpErrorResponse' : this.errorName(error),
        name: this.errorName(error),
        message: this.errorMessage(error),
        status: httpError?.status ?? null,
        statusText: httpError?.statusText || null,
        responseUrl: httpError?.url || null,
        responseHeaders: httpError ? this.headersToObject(httpError) : {},
        payload: httpError ? this.serializeValue(httpError.error) : this.serializeValue(error),
      },
      device: {
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        pageUrl: window.location.href,
        pageVisibility: document.visibilityState,
        connection: connection ? {
          effectiveType: connection.effectiveType ?? null,
          type: connection.type ?? null,
          downlink: connection.downlink ?? null,
          rtt: connection.rtt ?? null,
          saveData: connection.saveData ?? null,
        } : null,
      },
    };

    this.writeQueue([...this.readQueue(), diagnostic].slice(-this.maxStoredEntries));
  }

  notifyRequestSucceeded(): void {
    this.flush();
  }

  flush(): void {
    if (this.uploading) {
      return;
    }

    // Keep each upload below Express' JSON body limit even when many failures
    // accumulated during a long outage.
    const pending = this.readQueue().slice(0, 10);
    if (pending.length === 0) {
      return;
    }

    this.uploading = true;
    const uploadedIds = new Set(pending.map((entry) => entry.eventId));
    this.http.post<{ accepted: number }>(this.uploadUrl, { entries: pending }).subscribe({
      next: () => {
        // Preserve failures added while this batch was being uploaded.
        this.writeQueue(this.readQueue().filter((entry) => !uploadedIds.has(entry.eventId)));
        this.uploading = false;
        if (this.readQueue().length > 0) {
          setTimeout(() => this.flush(), 0);
        }
      },
      error: () => {
        // Keep the batch locally. The timer, an online/visibility event, or a
        // later successful cart request will try again.
        this.uploading = false;
      },
    });
  }

  private readQueue(): NetworkDiagnostic[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const stored = raw ? JSON.parse(raw) : [];
      return Array.isArray(stored) ? stored : [];
    } catch {
      return this.memoryQueue;
    }
  }

  private writeQueue(entries: NetworkDiagnostic[]): void {
    this.memoryQueue = entries;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch {
      // WebView storage may be unavailable/full. The in-memory queue still
      // gives us a chance to upload during this app session.
    }
  }

  private getAppInstanceId(): string {
    try {
      const existing = localStorage.getItem(this.appInstanceKey);
      if (existing) {
        return existing;
      }
      const id = this.newId();
      localStorage.setItem(this.appInstanceKey, id);
      return id;
    } catch {
      return 'storage-unavailable';
    }
  }

  private newId(): string {
    return globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private errorName(error: unknown): string {
    return error instanceof Error ? error.name : typeof error;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return typeof error === 'string' ? error : 'Unknown error';
  }

  private headersToObject(error: HttpErrorResponse): Record<string, string | null> {
    return Object.fromEntries(error.headers.keys().map((key) => [key, error.headers.get(key)]));
  }

  private serializeValue(value: unknown): unknown {
    let serializedValue: unknown;
    if (value instanceof Error) {
      serializedValue = { name: value.name, message: value.message, stack: value.stack ?? null };
    } else if (value instanceof ProgressEvent) {
      serializedValue = { type: value.type, loaded: value.loaded, total: value.total };
    } else {
      try {
        serializedValue = value == null ? value : JSON.parse(JSON.stringify(value));
      } catch {
        serializedValue = String(value);
      }
    }

    const json = JSON.stringify(serializedValue) ?? String(serializedValue);
    return json.length <= 4_000
      ? serializedValue
      : { truncated: true, preview: json.slice(0, 4_000) };
  }
}
