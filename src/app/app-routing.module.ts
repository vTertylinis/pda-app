import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs/tab2',
    pathMatch: 'full'
  },
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'tab1',
        loadComponent: () => import('./tab1/tab1.page').then(m => m.Tab1Page)
      },
      {
        path: 'tab2',
        loadComponent: () => import('./tab2/tab2.page').then(m => m.Tab2Page)
      },
      {
        path: '',
        redirectTo: 'tab2',
        pathMatch: 'full'
      }
    ]
  }
];

// Routes now use standalone `loadComponent` lazy-loading for pages
