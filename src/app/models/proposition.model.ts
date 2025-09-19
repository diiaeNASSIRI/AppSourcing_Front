export interface CandidatSummary {
  id?: number;
  firstName?: string | null;
  lastName?: string | null;
  label?: string | null;
}

export interface BesoinSummary {
  id?: number;
  libelle?: string | null;
  label?: string | null;
}

export type CandidatRef = CandidatSummary | number | null | undefined;
export type BesoinRef = BesoinSummary | number | null | undefined;

export interface Proposition {
  id?: number;
  candidat?: CandidatRef;
  besoin?: BesoinRef;

  dateProposition?: string | null;
  delaiReponse?: string | null;
  datePropale?: string | null;
  dateDemarrage?: string | null;
  statutQualif?: string | null;

  // convenience fields for UI (computed client-side)
  candidatName?: string | null;
  besoinLibelle?: string | null;
}

export interface PropositionRequest {
  candidatId: number;
  besoinId: number;
  dateProposition?: string | null;
  delaiReponse?: string | null;
  datePropale?: string | null;
  dateDemarrage?: string | null;
  statutQualif?: string | null;
}

export function extractCandidatId(ref: CandidatRef): number | null {
  if (ref == null) return null;
  if (typeof ref === 'number') return ref;
  return ref.id ?? null;
}

export function extractBesoinId(ref: BesoinRef): number | null {
  if (ref == null) return null;
  if (typeof ref === 'number') return ref;
  return ref.id ?? null;
}

export function formatCandidatName(ref: CandidatRef, fallback?: string | null): string | null {
  if (ref == null) return fallback ?? null;
  if (typeof ref === 'number') return `Candidat #${ref}`;
  const first = (ref.firstName ?? '').toString().trim();
  const last = (ref.lastName ?? '').toString().trim();
  const label = (ref.label ?? '').toString().trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  if (label) return label;
  if (ref.id != null) return `Candidat #${ref.id}`;
  return fallback ?? null;
}

export function formatBesoinLabel(ref: BesoinRef, fallback?: string | null): string | null {
  if (ref == null) return fallback ?? null;
  if (typeof ref === 'number') return `Besoin #${ref}`;
  const libelle = (ref.libelle ?? '').toString().trim();
  const label = (ref.label ?? '').toString().trim();
  if (libelle) return libelle;
  if (label) return label;
  if (ref.id != null) return `Besoin #${ref.id}`;
  return fallback ?? null;
}
