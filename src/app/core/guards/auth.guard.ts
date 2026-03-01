import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { AuthService } from '../services/api.services';

// ══════════════════════════════════════════════════════════════
//  AUTH GUARD
// ══════════════════════════════════════════════════════════════
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

export const directionGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isDirection()) return true;
  router.navigate(['/dashboard']);
  return false;
};

// ══════════════════════════════════════════════════════════════
//  JWT INTERCEPTOR
// ══════════════════════════════════════════════════════════════
export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const token = localStorage.getItem('kdi_token');
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

// ══════════════════════════════════════════════════════════════
//  ERROR INTERCEPTOR
// ══════════════════════════════════════════════════════════════
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        localStorage.removeItem('kdi_token');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
