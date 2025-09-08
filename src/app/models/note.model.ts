export interface NoteResponse {
  id: number;
  content: string;
  isPublic: boolean;
  authorEmail: string;
  createdAt: string;
}

export interface NoteRequest {
  content: string;
  isPublic?: boolean;
}

