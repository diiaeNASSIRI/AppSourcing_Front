import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NoteRequest, NoteResponse } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NoteServiceClient {
  private readonly base = '/candidats';

  constructor(private http: HttpClient) {}

  list(candidatId: number): Observable<NoteResponse[]> {
    return this.http.get<NoteResponse[]>(`${this.base}/${candidatId}/notes`);
  }

  add(candidatId: number, payload: NoteRequest): Observable<NoteResponse> {
    return this.http.post<NoteResponse>(`${this.base}/${candidatId}/notes`, payload);
  }

  update(candidatId: number, noteId: number, payload: NoteRequest): Observable<NoteResponse> {
    return this.http.put<NoteResponse>(`${this.base}/${candidatId}/notes/${noteId}`, payload);
  }

  delete(candidatId: number, noteId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${candidatId}/notes/${noteId}`);
  }
}
