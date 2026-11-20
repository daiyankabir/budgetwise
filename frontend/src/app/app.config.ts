import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MatNativeDateModule } from '@angular/material/core';

import { appRoutes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideCharts(withDefaultRegisterables()),
    importProvidersFrom(MatNativeDateModule),
  ],
};