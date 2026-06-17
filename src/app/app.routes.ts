import { Routes } from '@angular/router';
import { HomePage } from './shared/pages/home-page/home-page';
import {DataConverter} from './file-converter/pages/data-converter/data-converter';


export const routes: Routes = [
  {
    path:'home',
    component: HomePage
  },
  {
   path:'file-converter',
   component: DataConverter
  },
  {
    path:'**',
    redirectTo:'home'
  }
];
