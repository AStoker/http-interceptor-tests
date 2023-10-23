import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  of,
  retry,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';

import { AuthService, decodeJwtToken } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // Get the JWT from localStorage
    const jwt = this.authService.jwtToken;
    let returnRequest: HttpRequest<any> = request;
    // If the JWT exists, add it to the Authorization header
    // TODO: Have a blacklist of endpoints that don't need the jwt token (/public/* ignore, and login, and refresh)
    if (jwt) {

      // Get and decode the jwt expire time
      const decodedJwt = decodeJwtToken(jwt).payload;
      console.log(decodedJwt);
      const jwtExpireTime = new Date(decodedJwt.exp * 1000);
      const now = new Date();
      // If the jwt is expired, refresh it
      if (jwtExpireTime < now) {
        console.log('JWT is expired, refreshing.');
        return this.authService.refreshJwtToken().pipe(
          switchMap((newJwt: any) => {
            console.log('Refreshed token ' + newJwt);
            console.log('Placing token on request.');
            return next.handle(
              request.clone({
                setHeaders: { Authorization: `Bearer ${newJwt}` },
              })
            );
          })
        );
      }

      // Place the jwt on the request
      returnRequest = request.clone({
        setHeaders: { Authorization: `Bearer ${jwt}` },
      });
    }

    // Send the request on to the next handler
    // TODO: Check if the jwt token is expired. If it is, go ahead and try to refresh it first so we don't need to wait for a failed request
    return next.handle(returnRequest).pipe(
      catchError((err) => {
    // if (err instanceof HttpErrorResponse && err.status === 401) {
    //   console.log('401 error caught, refreshing the token.');

    //   return this.authService.refreshJwtToken().pipe(
    //     switchMap((newJwt: any) => {
    //       console.log('Refreshed token ' + newJwt);
    //       console.log('Placing token on request.');
    //       return next.handle(
    //         request.clone({
    //           setHeaders: { Authorization: `Bearer ${newJwt}` },
    //         })
    //       );
    //     })
    //   );
    // }
        // Unhandled error, pass along
        console.log(err);
        return throwError(
          () => new Error(err.error?.message || err.statusText)
        );
      })
    );
  }
}
