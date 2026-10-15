import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type Params = Record<string, string | number | boolean | null | undefined>;

/** Tous les appels à l'API passent par ici. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** L'app iPhone a besoin de l'adresse complète de l'API, le site web peut utiliser /api. */
  readonly baseUrl = (Capacitor.isNativePlatform() ? environment.nativeApiUrl : environment.apiUrl).replace(/\/$/, '');

  url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  get<T>(path: string, params?: Params): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.url(path), { params: this.params(params) }));
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.url(path), body ?? {}));
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(this.url(path), body ?? {}));
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.url(path), body ?? {}));
  }

  delete<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.url(path)));
  }

  upload<T>(path: string, file: Blob, filename = 'photo.jpg'): Promise<T> {
    const form = new FormData();
    form.append('file', file, filename);
    return firstValueFrom(this.http.post<T>(this.url(path), form));
  }

  blob(path: string, params?: Params): Promise<Blob> {
    return firstValueFrom(this.http.get(this.url(path), { params: this.params(params), responseType: 'blob' }));
  }

  private params(params?: Params): HttpParams {
    let p = new HttpParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null && value !== '') p = p.set(key, String(value));
    }
    return p;
  }
}

/** Transforme une erreur de l'API en phrase lisible. */
export function errorMessage(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string | string[] } };
  if (e?.status === 0) return 'Pas de connexion internet. Réessaie dans un instant.';
  const message = e?.error?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? 'Une erreur est survenue. Réessaie.';
}
