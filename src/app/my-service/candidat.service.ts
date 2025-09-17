import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidat, CandidatRequest } from '../models/candidat.model';

@Injectable({ providedIn: 'root' })
export class CandidatServiceClient {
  private readonly base = '/candidats';

  constructor(private http: HttpClient) {}

  // Read
  getAll(): Observable<Candidat[]> {
    return this.http.get<Candidat[]>(`${this.base}`);
  }

  getById(id: number): Observable<Candidat> {
    return this.http.get<Candidat>(`${this.base}/${id}`);
  }

  // Create
  create(payload: CandidatRequest): Observable<Candidat> {
    return this.http.post<Candidat>(`${this.base}`, payload);
  }

  // Update
  update(id: number, payload: CandidatRequest): Observable<Candidat> {
    return this.http.put<Candidat>(`${this.base}/${id}`, payload);
  }

  // Delete
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
