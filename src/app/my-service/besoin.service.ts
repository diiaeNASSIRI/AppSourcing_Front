import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Besoin, BesoinRequest } from '../models/besoin.model';

@Injectable({ providedIn: 'root' })
export class BesoinServiceClient {
  private readonly base = '/besoins';

  constructor(private http: HttpClient) {}

  // Read
  getAll(): Observable<Besoin[]> {
    return this.http.get<Besoin[]>(`${this.base}`);
  }

  getById(id: number): Observable<Besoin> {
    return this.http.get<Besoin>(`${this.base}/${id}`);
    }

  // Create
  create(payload: BesoinRequest): Observable<Besoin> {
    return this.http.post<Besoin>(`${this.base}`, payload);
  }

  // Update
  update(id: number, payload: BesoinRequest): Observable<Besoin> {
    return this.http.put<Besoin>(`${this.base}/${id}`, payload);
  }

  // Delete
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}


