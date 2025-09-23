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
  experience?: string | null; // libre (ex: 5 ans, Senior, Junior)
  pru?: number | null;
  links?: LinkItem[] | null;
  createdAt?: string | null;
}

export type CandidatRequest = Omit<Candidat, 'id' | 'createdAt'>;
