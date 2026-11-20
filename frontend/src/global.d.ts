// Global type declarations for Angular modules without declaration files
declare module '@angular/common' {
  export * from '@angular/common';
  export { CommonModule } from '@angular/common';
  export { HttpClient, HttpParams, HttpHeaders, HttpInterceptorFn, HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
  export { HttpClientModule } from '@angular/common/http';
}

declare module '@angular/core' {
  export * from '@angular/core';
  export { Component, Injectable, inject, signal, computed, effect, OnInit, OnDestroy, OnChanges, AfterViewInit, ViewChild, ViewChildren, ContentChild, ContentChildren, Input, Output, EventEmitter, HostListener, HostBinding, Directive, Pipe, NgModule, NgZone, ChangeDetectorRef, ElementRef, TemplateRef, ViewContainerRef, ApplicationRef, Injector, ModuleWithProviders, Type } from '@angular/core';
  export { provideHttpClient, withInterceptors, withInterceptorsFromDi, withJsonpSupport, withXsrfConfiguration } from '@angular/common/http';
}

declare module '@angular/common/http' {
  export * from '@angular/common/http';
  export { HttpClient, HttpParams, HttpHeaders, HttpInterceptorFn, HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
  export { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
}

declare module '@angular/forms' {
  export * from '@angular/forms';
  export { FormBuilder, FormGroup, FormControl, FormArray, Validators, ReactiveFormsModule, FormsModule, AbstractControl, ValidatorFn, AsyncValidatorFn, ValidationErrors, FormGroupDirective, NgForm, NgModel, NgModelGroup } from '@angular/forms';
}

declare module '@angular/router' {
  export * from '@angular/router';
  export { Router, RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute, RouterState, RouterStateSnapshot, CanActivateFn, CanMatchFn, CanDeactivateFn, ResolveFn, Routes, provideRouter, withComponentInputBinding, withDebugTracing, withEnabledBlockingInitialNavigation, withHashLocation, withInMemoryScrolling, withRouterConfig, withViewTransitions } from '@angular/router';
}

declare module '@angular/platform-browser' {
  export * from '@angular/platform-browser';
  export { bootstrapApplication } from '@angular/platform-browser';
}

declare module '@angular/platform-browser/animations' {
  export * from '@angular/platform-browser/animations';
  export { provideAnimations, provideNoopAnimations } from '@angular/platform-browser/animations';
}

declare module '@angular/material' {
  export * from '@angular/material';
}

declare module '@angular/material/button' {
  export * from '@angular/material/button';
  export { MatButtonModule, MatButton, MatIconButton, MatFabButton, MatMiniFabButton, MatAnchor } from '@angular/material/button';
}

declare module '@angular/material/icon' {
  export * from '@angular/material/icon';
  export { MatIconModule, MatIconRegistry } from '@angular/material/icon';
}

declare module '@angular/material/toolbar' {
  export * from '@angular/material/toolbar';
  export { MatToolbarModule, MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
}

declare module '@angular/material/menu' {
  export * from '@angular/material/menu';
  export { MatMenuModule, MatMenuTrigger, MatMenu, MatMenuItem, MatMenuPanel } from '@angular/material/menu';
}

declare module '@angular/material/divider' {
  export * from '@angular/material/divider';
  export { MatDividerModule, MatDivider } from '@angular/material/divider';
}

declare module '@angular/material/form-field' {
  export * from '@angular/material/form-field';
  export { MatFormFieldModule, MatFormField, MatLabel, MatHint, MatError, MatPrefix, MatSuffix } from '@angular/material/form-field';
}

declare module '@angular/material/input' {
  export * from '@angular/material/input';
  export { MatInputModule, MatInput } from '@angular/material/input';
}

declare module '@angular/material/select' {
  export * from '@angular/material/select';
  export { MatSelectModule, MatSelect, MatOption, MatOptgroup } from '@angular/material/select';
}

declare module '@angular/material/card' {
  export * from '@angular/material/card';
  export { MatCardModule, MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent, MatCardActions, MatCardFooter, MatCardImage, MatCardAvatar, MatCardLgImage, MatCardMdImage, MatCardSmImage, MatCardXlImage } from '@angular/material/card';
}

declare module '@angular/material/progress-spinner' {
  export * from '@angular/material/progress-spinner';
  export { MatProgressSpinnerModule, MatProgressSpinner, MatSpinner } from '@angular/material/progress-spinner';
}

declare module '@angular/material/snack-bar' {
  export * from '@angular/material/snack-bar';
  export { MatSnackBarModule, MatSnackBar, MatSnackBarRef, MatSnackBarConfig } from '@angular/material/snack-bar';
}

declare module '@angular/material/dialog' {
  export * from '@angular/material/dialog';
  export { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
}

declare module '@angular/material/table' {
  export * from '@angular/material/table';
  export { MatTableModule, MatTable, MatColumnDef, MatHeaderRowDef, MatRowDef, MatHeaderCellDef, MatCellDef, MatFooterCellDef, MatHeaderRow, MatRow, MatFooterRow, MatHeaderCell, MatCell, MatFooterCell } from '@angular/material/table';
}

declare module '@angular/material/paginator' {
  export * from '@angular/material/paginator';
  export { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
}

declare module '@angular/material/sort' {
  export * from '@angular/material/sort';
  export { MatSortModule, MatSort, MatSortHeader, Sort } from '@angular/material/sort';
}

declare module '@angular/material/datepicker' {
  export * from '@angular/material/datepicker';
  export { MatDatepickerModule, MatDatepicker, MatDatepickerInput, MatDatepickerToggle, MatCalendar } from '@angular/material/datepicker';
}

declare module '@angular/material/core' {
  export * from '@angular/material/core';
  export { MatNativeDateModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS, DateAdapter, MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';
}

declare module '@angular/material/tooltip' {
  export * from '@angular/material/tooltip';
  export { MatTooltipModule, MatTooltip } from '@angular/material/tooltip';
}

declare module 'chart.js' {
  export * from 'chart.js/auto';
  export { Chart, ChartConfiguration, ChartData, ChartOptions, ChartType, ChartDataset, Plugin, ChartEvent, DefaultDataPoint, InteractionItem, ChartComponentLike, ChartArea, ChartItem, ChartMeta, ChartTooltipItem, ChartTooltipModel } from 'chart.js';
}

declare module 'ng2-charts' {
  export * from 'ng2-charts';
  export { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
}

declare module 'rxjs' {
  export * from 'rxjs';
  export { Observable, Subject, BehaviorSubject, ReplaySubject, AsyncSubject, Subscription, Observer, OperatorFunction, pipe, of, from, merge, concat, combineLatest, forkJoin, zip, race, interval, timer, throwError, EMPTY, NEVER, defer, iif, range, generate, bindCallback, bindNodeCallback, empty, never, throwError as rxjsThrowError } from 'rxjs';
}

declare module 'rxjs/operators' {
  export * from 'rxjs/operators';
  export { map, filter, tap, catchError, switchMap, mergeMap, concatMap, exhaustMap, debounceTime, distinctUntilChanged, startWith, take, takeUntil, skip, skipWhile, takeWhile, buffer, bufferCount, bufferTime, bufferToggle, bufferWhen, window, windowCount, windowTime, windowToggle, windowWhen, groupBy, partition, pairwise, pluck, elementAt, first, last, single, defaultIfEmpty, every, find, findIndex, reduce, scan, count, max, min, isEmpty, sequenceEqual, toArray, toSet, toMap, toPromise, materialize, dematerialize, observeOn, subscribeOn, timeInterval, timestamp, timeout, timeoutWith, retry, retryWhen, repeat, repeatWhen, delay, delayWhen, throttleTime, throttle, auditTime, audit, sampleTime, sample, window, windowCount, windowTime, windowToggle, windowWhen } from 'rxjs/operators';
}