import { Routes } from '@angular/router';
import { HomePage } from './shared/pages/home-page/home-page';

export const routes: Routes = [
  {
    path:'home',
    component: HomePage
  },
  // {
  //   path:'file-converter',
  //   //component:
  // },
  {
    path:'**',
    redirectTo:'home'
  }
];
