export interface Besoin {
  id?: number;
  libelle: string;
  projet: string;
  owner: string;
  pru?: number | null;
  dateCreation?: string | null; // ISO date string (yyyy-MM-dd)
  site?: string | null;
  precision?: string | null;
  priorite?: string | null; // ex: Basse | Moyenne | Haute
  statut?: string | null;   // ex: Ouvert | Sourcing | Clos
  nbrExperience?: number | null; // en années
}

export type BesoinRequest = Omit<Besoin, 'id'>;
