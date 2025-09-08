export interface LinkItem {
  id?: number;
  label: string;
  path: string;
}

export interface Candidat {
  id?: number;
  firstName: string;
  lastName: string;
  profil: string;
  dateDisponibilite?: string | null;
  experience?: number | null;
  pru?: number | null;
  links?: LinkItem[] | null;
  createdAt?: string | null;
}

export type CandidatRequest = Omit<Candidat, 'id' | 'createdAt'>;
