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
    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);

    authService = TestBed.inject(AuthService);
    authInterceptor = interceptorOf(AuthInterceptor);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('makes a normal request', (done) => {

    // Create a VALID_TOKEN that doesn't expire for 30 minutes
    const VALID_TOKEN = createJwtToken(Math.floor(Date.now() / 1000) + 30 * 60);

    authService.jwtToken = VALID_TOKEN;

    httpClient.get('/some-endpoint').subscribe({
      next: (d) => {
        console.log(
          'Successfully made request',
          d
        );
        // Make sure the authorization header has the token of VALID_TOKEN
        done();
      },
      error: (e) => {
        console.log('Errored out: ', e);
        expect(true).toBe(false);
        fail('We failed');
      },
    });

    const httpRequest = httpTestingController.match((req) => {
      return req.url === '/some-endpoint' && req.headers.get('Authorization') == `Bearer ${VALID_TOKEN}`;
    });
    httpRequest[0].flush('great success'); // This request never makes it to the final test.

  });
  it('handles refreshing the token before making the request', (done) => {

    // Create a EXPIRED_TOKEN that has expired
    const EXPIRED_TOKEN = createJwtToken(Math.floor(Date.now() / 1000) - 30 * 60);

    // Create a VALID_TOKEN that doesn't expire for 30 minutes
    const VALID_TOKEN = createJwtToken(Math.floor(Date.now() / 1000) + 30 * 60);

    authService.jwtToken = EXPIRED_TOKEN;

    // Create a spy on the refreshJwtToken function. Doesn't need to actually do anything
    jest.spyOn(authService, 'refreshJwtToken').mockImplementation(() => of(VALID_TOKEN));

    httpClient.get('/some-endpoint').subscribe({
      next: (d) => {
        console.log(
          'Successfully made request',
          d
        );
        // Make sure the authorization header has the token of VALID_TOKEN
        done();
      },
      error: (e) => {
        console.log('Errored out: ', e);
        expect(true).toBe(false);
        fail('We failed');
      },
    });

    const httpRequest = httpTestingController.match((req) => {
      return req.url === '/some-endpoint' && req.headers.get('Authorization') == `Bearer ${VALID_TOKEN}`;
    });
    httpRequest[0].flush('great success'); // This request never makes it to the final test.

  });
  it('handles refreshing the token if 401 is returned', (done) => {
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
        done();
      },
      error: (e) => {
        console.log('We failed', e);
        expect(true).toBe(false);
        fail('We failed');
      },
    });

    const httpRequest = httpTestingController.match('/some-endpoint');
    httpRequest[0].flush('some error', {
      status: 401,
      statusText: 'Unauthorized',
    }); // This request never makes it to the final test.


    const req2 = httpTestingController.match(req => {
      console.log(req.url, req.headers.getAll('Authorization'));
      return req.url === '/some-endpoint' && req.headers.get('Authorization') == `Bearer ${VALID_TOKEN}`;
    });
    req2[0].flush('Hello World'); // This request does make it to the final test.


  });
});

/**
 * Create a quick JWT token for testing
 * @param exp The expiration date of the token
 * @returns The JWT token
 */
function createJwtToken(exp: number): string {
  const header = { alg: 'HS512', typ: 'JWT' };
  const payload = {
    "sub": "swampfox",
    "ref": "false",
    "src": "DATABASE",
    "auths": [
      "Swampfox"
    ],
    "en": true,
    "uisexp": false,
    "exp": exp,
    "user": "swampfox",
    "timeout": 30
  };
  const headerEncoded = window.btoa(JSON.stringify(header));
  const payloadEncoded = window.btoa(JSON.stringify(payload));
  const signature = 'testsignature';

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}