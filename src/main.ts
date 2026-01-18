import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';

import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

addIcons(icons as any);

bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular(),
    provideRouter(routes),
    provideHttpClient(),
  ],
});
