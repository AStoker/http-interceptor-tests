import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  jwtToken = 'some-token';

  refreshJwtToken(): Observable<string | null> {
    return of(this.jwtToken);
  }
}

/**
 * Decode a JWT token
 * @param token The token to decode
 * @returns JWT The decoded token
 */
export function decodeJwtToken(token: string) {
  const parts = token.split('.');
  const header = JSON.parse(window.atob(parts[0]));
  const payload = JSON.parse(window.atob(parts[1]));
  return {
    header,
    payload
  };
}