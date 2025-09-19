import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ReferenceType = 'status' | 'site' | 'priority';

export interface ReferenceItem {
  id?: number;
  code: string;
  label: string;
  description?: string | null;
  active?: boolean | null;
  sortOrder?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ReferenceService {
  private readonly base = `/api/admin/reference`;

  constructor(private http: HttpClient) {}

  list(type: ReferenceType): Observable<ReferenceItem[]> {
    return this.http.get<ReferenceItem[]>(`${this.base}/${type}`);
  }

  create(type: ReferenceType, payload: Partial<ReferenceItem>): Observable<ReferenceItem> {
    return this.http.post<ReferenceItem>(`${this.base}/${type}`, payload);
  }

  update(type: ReferenceType, id: number, payload: Partial<ReferenceItem>): Observable<ReferenceItem> {
    return this.http.put<ReferenceItem>(`${this.base}/${type}/${id}`, payload);
  }

  delete(type: ReferenceType, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${type}/${id}`);
  }
}


