import { Component } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { AndroidFullScreen } from '@awesome-cordova-plugins/android-full-screen/ngx';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    IonicModule,
    RouterModule,
  ],
  providers: [AndroidFullScreen]
})
export class AppComponent {
  constructor(private platform: Platform, private androidFullScreen: AndroidFullScreen) {
    this.platform.ready().then(() => {
      if (this.platform.is('android')) {
        this.androidFullScreen.immersiveMode()
          .then(() => console.log('Immersive mode enabled'))
          .catch(err => console.error('Error enabling immersive mode', err));
      }
    });
  }
}
