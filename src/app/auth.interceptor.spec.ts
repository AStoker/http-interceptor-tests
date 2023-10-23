import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { Type } from '@angular/core';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';

import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { of } from 'rxjs';

const interceptorOf = <T>(type: Type<T>) =>
  TestBed.inject(HTTP_INTERCEPTORS).find(
    (interceptor) => interceptor instanceof type
  ) as unknown as T;

describe('auth interceptor', () => {
  let httpTestingController: HttpTestingController;
  let httpClient: HttpClient;
  let authInterceptor: AuthInterceptor;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        // AuthInterceptor,
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);

    authService = TestBed.inject(AuthService);
    authInterceptor = interceptorOf(AuthInterceptor);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('handles refresh token', fakeAsync(() => {
    const VALID_TOKEN = 'some-jwt-token';

    // Create a spy on the refreshJwtToken function. Doesn't need to actually do anything
    jest
      .spyOn(authService, 'refreshJwtToken')
      .mockImplementation(() => of(VALID_TOKEN));

    httpClient.get('/some-endpoint').subscribe({
      next: (d) => {
        console.log(
          'Successfully refreshed the token and succeeded the request',
          d
        );
        expect(authService.refreshJwtToken).toHaveBeenCalled();
      },
      error: (e) => {
        console.log('We failed', e);
        expect(true).toBe(false);
      },
    });

    const httpRequest = httpTestingController.match('/some-endpoint');
    httpRequest[0].flush('some error', {
      status: 401,
      statusText: 'Unauthorized',
    }); // This request never makes it to the final test.

    flush();

    const req2 = httpTestingController.match(req => {
      console.log(req.url, req.headers.getAll('Authorization'));
      return req.url === '/some-endpoint' && req.headers.get('Authorization') == `Bearer ${VALID_TOKEN}`;
    });
    req2[0].flush('Hello World'); // This request does make it to the final test.

    flush();

  }));
});
