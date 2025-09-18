export interface RefItem {
  id: number;
  code: string;
  label: string;
  description?: string | null;
  active?: boolean | null;
  sortOrder?: number | null;
}

export interface Besoin {
  id?: number;
  libelle: string;
  projet: string;
  owner: string;
  pru?: number | null;
  dateCreation?: string | null; // ISO date string (yyyy-MM-dd)
  site?: RefItem | null;
  precision?: string | null;
  priorite?: RefItem | null; // nested ref entity
  statut?: RefItem | null;   // nested ref entity
  nbrExperience?: string | null; // maintenant libre (ex: "2 ans", "Junior", etc.)
}

export interface BesoinRequest {
  libelle: string;
  projet: string;
  owner: string;
  precision?: string | null;
  pru?: number | null;
  dateCreation?: string | null;
  nbrExperience?: string | null; // string uniquement côté frontend
  prioriteId?: number | null;
  statutId?: number | null;
  siteId?: number | null;
}

