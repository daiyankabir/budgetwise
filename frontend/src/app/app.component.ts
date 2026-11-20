import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <app-navbar />
      <main class="main-content-wrapper">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .main-content-wrapper {
      flex: 1;
    }
  `],
})
export class AppComponent {
  title = 'BudgetWise';
}