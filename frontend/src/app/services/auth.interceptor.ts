import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, EMPTY, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private snackBar: MatSnackBar) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.token();

    if (token) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      return next.handle(authReq).pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            if (this.authService.isAuthenticated()) {
              this.authService.logout();
              this.snackBar.open('Your session has expired. Please sign in again.', 'Close', { duration: 5000 });
            }
            return EMPTY;
          }
          return throwError(() => error);
        }),
      );
    }

    return next.handle(req);
  }
}