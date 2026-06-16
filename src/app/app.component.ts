import { Component, inject } from '@angular/core';
import { Platform, IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AndroidFullScreen } from '@awesome-cordova-plugins/android-full-screen/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, RouterModule],
  providers: [AndroidFullScreen]
})
export class AppComponent {
  private platform = inject(Platform);
  private androidFullScreen = inject(AndroidFullScreen);

  constructor() {
    this.platform.ready().then(() => {
      if (this.platform.is('android')) {
        this.androidFullScreen.immersiveMode()
          .then(() => console.log('Immersive mode enabled'))
          .catch(err => console.error('Error enabling immersive mode', err));
      }
    });
  }
}
