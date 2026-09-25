import { Component, DestroyRef, NgZone, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { AndroidFullScreen } from '@awesome-cordova-plugins/android-full-screen/ngx';
import { Capacitor } from '@capacitor/core';
import { DialogService } from './ui/dialog.service';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { TableService } from './services/table.service';
import { NetworkDiagnosticsService } from './services/network-diagnostics.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [AndroidFullScreen]
})
export class AppComponent {
  private destroyRef = inject(DestroyRef);
  private zone = inject(NgZone);
  private dialogs = inject(DialogService);
  private router = inject(Router);
  private androidFullScreen = inject(AndroidFullScreen);
  private tableService = inject(TableService);
  // Instantiate at app startup so diagnostics left by an earlier outage are
  // uploaded even if the user does not immediately open another table.
  private networkDiagnostics = inject(NetworkDiagnosticsService);

  constructor() {
    this.networkDiagnostics.flush();
    if (Capacitor.getPlatform() === 'android') {
        const ua = navigator.userAgent.toLowerCase();
        const isXiaomi = ua.includes('xiaomi') || ua.includes('miui') || ua.includes('redmi');

        if (isXiaomi) {
          this.androidFullScreen.isImmersiveModeSupported()
            .then(() => this.androidFullScreen.leanMode())
            .then(() => console.log('Lean mode enabled (Xiaomi)'))
            .catch(err => console.warn('Fullscreen not supported:', err));
        } else {
          this.androidFullScreen.immersiveMode()
            .then(() => console.log('Immersive mode enabled'))
            .catch(err => console.error('Error enabling immersive mode', err));
        }

        const listeners = [
          App.addListener('pause', () => this.zone.run(() => this.tableService.disconnect())),
          App.addListener('resume', () => this.zone.run(() => this.tableService.reconnect())),
          App.addListener('backButton', () => this.zone.run(() => {
            if (!this.dialogs.hasOpenDialog && this.router.url !== '/tabs/tab1') {
              void this.router.navigateByUrl('/tabs/tab1');
            }
          }))
        ];
        this.destroyRef.onDestroy(() => {
          for (const listener of listeners) { void listener.then(handle => handle.remove()); }
        });
      }
  }
}
