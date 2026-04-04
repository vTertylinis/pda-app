import { Component } from '@angular/core';
import { Platform, IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AndroidFullScreen } from '@awesome-cordova-plugins/android-full-screen/ngx';
import { App } from '@capacitor/app';
import { TableService } from './services/table.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, RouterModule],
  providers: [AndroidFullScreen]
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private androidFullScreen: AndroidFullScreen,
    private tableService: TableService
  ) {
    this.platform.ready().then(() => {
      if (this.platform.is('android')) {
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

        App.addListener('pause', () => {
          this.tableService.disconnect();
        });

        App.addListener('resume', () => {
          this.tableService.reconnect();
        });
      }
    });
  }
}
