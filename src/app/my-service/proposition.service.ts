import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proposition, PropositionRequest } from '../models/proposition.model';

@Injectable({ providedIn: 'root' })
export class PropositionServiceClient {
  private readonly base = '/propositions';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Proposition[]> {
    return this.http.get<Proposition[]>(`${this.base}`);
  }

  getById(id: number): Observable<Proposition> {
    return this.http.get<Proposition>(`${this.base}/${id}`);
  }

  // Filters
  getByBesoinId(besoinId: number): Observable<Proposition[]> {
    return this.http.get<Proposition[]>(`${this.base}/by-besoin/${besoinId}`);
  }

  getByCandidatId(candidatId: number): Observable<Proposition[]> {
    return this.http.get<Proposition[]>(`${this.base}/by-candidat/${candidatId}`);
  }

  create(payload: PropositionRequest): Observable<Proposition> {
    return this.http.post<Proposition>(`${this.base}`, payload);
  }

  update(id: number, payload: PropositionRequest): Observable<Proposition> {
    return this.http.put<Proposition>(`${this.base}/${id}`, payload);
  }

  updateStatus(id: number, statutQualif: string | null): Observable<Proposition> {
    return this.http.patch<Proposition>(`${this.base}/${id}/status`, { statutQualif });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.base}`);
  }
}
