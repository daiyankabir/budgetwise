import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { Chart } from 'chart.js';
import { Subject } from 'rxjs';

export type ThemeName = 'light' | 'dark';

export interface ThemePalette {
  text: string;
  border: string;
  income: string;
  expense: string;
  incomeFill: string;
  expenseFill: string;
}

const THEME_PALETTES: Record<ThemeName, ThemePalette> = {
  light: {
    text: '#525252',
    border: 'rgba(23, 23, 23, 0.12)',
    income: '#15803d',
    expense: '#b91c1c',
    incomeFill: 'rgba(21, 128, 61, 0.12)',
    expenseFill: 'rgba(185, 28, 28, 0.12)',
  },
  dark: {
    text: '#b5b5bb',
    border: 'rgba(237, 237, 237, 0.14)',
    income: '#4cc38a',
    expense: '#f87171',
    incomeFill: 'rgba(76, 195, 138, 0.14)',
    expenseFill: 'rgba(248, 113, 113, 0.14)',
  },
};

const THEME_STORAGE_KEY = 'budgetwise-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly current = signal<ThemeName>('light');
  readonly palette = signal<ThemePalette>(THEME_PALETTES.light);
  readonly themeChanged$ = new Subject<ThemeName>();

  constructor(@Inject(DOCUMENT) private document: Document) {
    const theme = this.readSavedTheme();
    this.current.set(theme);
    this.palette.set(THEME_PALETTES[theme]);
    this.apply(theme);
  }

  setTheme(theme: ThemeName): void {
    if (this.current() === theme) {
      return;
    }

    const storage = this.document.defaultView?.localStorage;
    if (!storage) {
      throw new Error('Theme preferences cannot be saved in this browser');
    }

    storage.setItem(THEME_STORAGE_KEY, theme);
    this.current.set(theme);
    this.palette.set(THEME_PALETTES[theme]);
    this.apply(theme);
    this.themeChanged$.next(theme);
  }

  private apply(theme: ThemeName): void {
    this.document.documentElement.setAttribute('data-theme', theme);
    Chart.defaults.color = THEME_PALETTES[theme].text;
    Chart.defaults.borderColor = THEME_PALETTES[theme].border;
  }

  private readSavedTheme(): ThemeName {
    try {
      const storedTheme = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) ?? null;
      if (storedTheme === 'dark') {
        return 'dark';
      }

      if (storedTheme && storedTheme !== 'light') {
        this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, 'light');
      }

      return 'light';
    } catch (error) {
      console.warn('BudgetWise could not read the saved theme preference', error);
      return 'light';
    }
  }
}
