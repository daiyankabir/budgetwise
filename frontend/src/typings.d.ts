declare module '*.scss' {
  const content: string;
  export default content;
}

declare module '@angular/common' {
  export * from '@angular/common/public_api';
}

declare module '@angular/common/http' {
  export * from '@angular/common/http/public_api';
}

declare module '@angular/forms' {
  export * from '@angular/forms/public_api';
}

declare module '@angular/router' {
  export * from '@angular/router/public_api';
}

declare module '@angular/core' {
  export * from '@angular/core/public_api';
}

declare module 'rxjs' {
  export * from 'rxjs';
}

declare module 'rxjs/operators' {
  export * from 'rxjs/operators';
}

declare module 'chart.js' {
  export * from 'chart.js/auto';
}

declare module 'ng2-charts' {
  export * from 'ng2-charts';
}