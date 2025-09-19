import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Besoin, BesoinRequest, RefItem } from '../../models/besoin.model';
import { BesoinServiceClient } from '../../my-service/besoin.service';
import { Proposition, extractCandidatId, formatCandidatName, formatBesoinLabel } from '../../models/proposition.model';
import { PropositionServiceClient } from '../../my-service/proposition.service';
import { AuthService } from '../../my-service/auth.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ReferenceStyleService } from '../../my-service/reference-style.service';
import { ReferenceService, ReferenceType } from '../../my-service/reference.service';
import { Candidat } from '../../models/candidat.model';
import { CandidatServiceClient } from '../../my-service/candidat.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-besoins',
  templateUrl: './besoins.component.html',
  styleUrls: ['./besoins.component.css']
})
export class BesoinsComponent implements OnInit {
  @ViewChild('besoinForm') besoinFormTpl!: TemplateRef<any>;
  @ViewChild('candidatsForBesoinTpl') candidatsForBesoinTpl!: TemplateRef<any>;
  @ViewChild('candidatInfo') candidatInfoTpl!: TemplateRef<any>;
  @ViewChild('besoinInfo') besoinInfoTpl!: TemplateRef<any>;

  besoins: Besoin[] = [];
  loading = false;
  error: string | null = null;

  selectedBesoin: Besoin | null = null;
  propositionsPourBesoin: Proposition[] = [];
  candidatsMap: Map<number, Candidat> = new Map<number, Candidat>();
  candidateDetail?: Candidat;
  besoinDetail?: Besoin;
  // Inline statut options for propositions in the modal
  private readonly defaultPropStatusOptions: string[] = [
    'Nouveau',
    'Qualifié',
    'En cours',
    'Proposé',
    'Entretien',
    'Accepté',
    'Refusé',
    'Clôturé'
  ];
  propStatusOptions: string[] = [...this.defaultPropStatusOptions];
  savingStatus: Record<number, boolean> = {};

  form!: FormGroup;
  showForm = false;
  editingId: number | null = null;

  private modalRef?: NgbModalRef;

  // Table UI state (search/sort/pagination)
  searchControl = new FormControl<string>('', { nonNullable: true });
  page = 1;
  pageSize = 20;
  sortKey: 'libelle' | 'projet' | 'precision' | 'owner' | 'dateCreation' | 'pru' | 'nbrExperience' | 'priorite' | 'statut' | 'site' = 'libelle';
  sortDir: 'asc' | 'desc' = 'asc';

  // Reference lists
  refStatus: RefItem[] = [];
  refSites: RefItem[] = [];
  refPriorities: RefItem[] = [];

  constructor(
    private readonly besoinApi: BesoinServiceClient,
    private readonly fb: FormBuilder,
    public readonly auth: AuthService,
    private readonly modal: NgbModal,
    private readonly propositionsApi: PropositionServiceClient,
    private readonly refs: ReferenceService,
    private readonly candidatsApi: CandidatServiceClient,
    private readonly style: ReferenceStyleService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      libelle: ['', [Validators.required, Validators.maxLength(255)]],
      projet: ['', [Validators.required, Validators.maxLength(255)]],
      owner: ['', [Validators.required, Validators.maxLength(255)]],
  dateCreation: [null], // date saisie par l'utilisateur (yyyy-MM-dd)
      siteId: [null],
      pru: [null, [Validators.min(0)]],
      precision: ['', [Validators.maxLength(255)]],
      prioriteId: [null],
      statutId: [null],
  nbrExperience: [null], // texte libre désormais
    });

    if (this.canView()) {
      this.loadReferences();
      this.loadAll();
    } else {
      console.warn('[Besoins] Accès refusé: permission CAN_VIEW manquante');
      this.error = 'Accès refusé (permission CAN_VIEW requise)';
    }
  }

  // Derived lists for table
  get filteredBesoins(): Besoin[] {
    const q = (this.searchControl.value || '').trim().toLowerCase();
    if (!q) return this.besoins;
    return this.besoins.filter(b => (
      (b.libelle || '').toLowerCase().includes(q) ||
      (b.projet || '').toLowerCase().includes(q) ||
      (b.precision || '').toLowerCase().includes(q) ||
      (b.owner || '').toLowerCase().includes(q) ||
      (b.site?.label || '').toLowerCase().includes(q)
    ));
  }

  get sortedBesoins(): Besoin[] {
    const sortableBesoins = [...this.filteredBesoins];
    const k = this.sortKey;
    const d = this.sortDir === 'asc' ? 1 : -1;
    sortableBesoins.sort((a: any, b: any) => {
      // numeric sort for pru and nbrExperience
      if (k === 'pru' || k === 'nbrExperience') {
        const av = Number(a?.[k] ?? 0);
        const bv = Number(b?.[k] ?? 0);
        return (av - bv) * d;
      }
      // nested label for refs
      const getVal = (obj: any): string => {
        if (k === 'priorite' || k === 'statut' || k === 'site') {
          return (obj?.[k]?.label ?? '').toString().toLowerCase();
        }
        return (obj?.[k] ?? '').toString().toLowerCase();
      };
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return -1 * d;
      if (av > bv) return 1 * d;
      return 0;
    });
    return sortableBesoins;
  }

  get pageItems(): Besoin[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sortedBesoins.slice(start, start + this.pageSize);
  }

  get totalItems(): number {
    return this.filteredBesoins.length;
  }

  setSort(key: 'libelle' | 'projet' | 'precision' | 'owner' | 'dateCreation' | 'pru' | 'nbrExperience' | 'priorite' | 'statut' | 'site'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
  }

  private loadReferences(): void {
    const normalize = (list: RefItem[]): RefItem[] => {
      const onlyActive = (list || []).filter((r) => r && r.active !== false);
      return onlyActive.sort((a, b) => (Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)) || a.label.localeCompare(b.label));
    };
    const load = (type: ReferenceType, assign: (arr: RefItem[]) => void) => {
      this.refs.list(type).subscribe({
        next: (arr: any) => assign(normalize((arr || []) as RefItem[])),
        error: (e) => console.warn('[Besoins] failed to load refs', type, e)
      });
    };
    load('status', (a) => { this.refStatus = a; this.refreshPropStatusOptions(); });
    load('site', (a) => this.refSites = a);
    load('priority', (a) => this.refPriorities = a);
  }

  private refreshPropStatusOptions(): void {
    const labels = (this.refStatus || [])
      .map(item => (item?.label ?? '').trim())
      .filter((label, index, array) => label && array.indexOf(label) === index);
    this.propStatusOptions = labels.length ? labels : [...this.defaultPropStatusOptions];
  }

  loadAll(): void {
    this.loading = true;
    this.error = null;
    this.besoinApi.getAll().subscribe({
      next: (data) => {
        const LocalBesoins = (data as any[]) ?? [];
        // Normalize potential id-only or partial objects due to backend identity serialization
        this.besoins = LocalBesoins
          .filter((b) => b != null)
          .map((b: any): Besoin => {
            if (typeof b === 'number') {
              // Backend sent just an ID
              return { id: b, libelle: `Besoin #${b}`, projet: '', owner: '' } as Besoin;
            }
            const id = b.id as number | undefined;
            const libelle = (b.libelle ?? '').toString();
            return {
              ...b,
              libelle: libelle || (id != null ? `Besoin #${id}` : ''),
              projet: (b.projet ?? '').toString(),
              owner: (b.owner ?? '').toString(),
              precision: b.precision ?? null,
              pru: b.pru ?? null,
              nbrExperience: b.nbrExperience ?? null,
            } as Besoin;
          });
        this.loading = false;
      },
      error: (err) => {
        console.error('[Besoins] loadAll error', err);
        if (err?.status === 403) {
          this.error = 'Accès refusé (permissions insuffisantes)';
        } else if (err?.status === 401) {
          this.error = 'Session expirée/invalidée. Veuillez vous reconnecter.';
        } else {
          this.error = 'Échec de chargement des besoins';
        }
        this.loading = false;
      }
    });
  }

  startCreate(): void {
    if (!this.canCreate()) return;
    this.form.reset({
      libelle: '',
      projet: '',
      owner: '',
  dateCreation: null,
      siteId: null,
      pru: null,
      precision: '',
      prioriteId: null,
      statutId: null,
  nbrExperience: null,
    });
    this.editingId = null;
    this.modalRef = this.modal.open(this.besoinFormTpl, { size: 'lg', centered: true, backdrop: 'static' });
  }

  startEdit(b: Besoin): void {
    if (!this.canEdit()) return;
    this.form.reset({
      libelle: b.libelle ?? '',
      projet: b.projet ?? '',
      owner: b.owner ?? '',
  dateCreation: b.dateCreation ?? null,
      siteId: b.site?.id ?? null,
      pru: b.pru ?? null,
      precision: b.precision ?? '',
      prioriteId: b.priorite?.id ?? null,
      statutId: b.statut?.id ?? null,
  nbrExperience: b.nbrExperience ?? null,
    });
    this.editingId = b.id ?? null;
    this.modalRef = this.modal.open(this.besoinFormTpl, { size: 'lg', centered: true, backdrop: 'static' });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.modalRef?.dismiss();
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.value as any;
    const payload: BesoinRequest = {
      libelle: v.libelle,
      projet: v.projet,
      owner: v.owner,
      precision: v.precision ?? null,
      pru: v.pru ?? null,
  dateCreation: v.dateCreation || null, // conserver la date saisie (ou null si non fournie)
  nbrExperience: v.nbrExperience != null ? String(v.nbrExperience).trim() || null : null,
      prioriteId: v.prioriteId ?? null,
      statutId: v.statutId ?? null,
      siteId: v.siteId ?? null,
    };
    this.loading = true;
    this.error = null;

    const obs = this.editingId != null
      ? this.besoinApi.update(this.editingId, payload)
      : this.besoinApi.create(payload);

    obs.subscribe({
      next: () => {
        this.showForm = false;
        this.editingId = null;
        this.loadAll();
        this.modalRef?.close();
      },
      error: (err) => {
        console.error('[Besoins] submit error', err);
        this.error = err?.error?.message || 'Opération échouée';
        this.loading = false;
      }
    });
  }

  remove(b: Besoin): void {
    if (!this.canDelete()) return;
    if (!b.id) return;
    const ok = confirm(`Supprimer le besoin "${b.libelle}" ?`);
    if (!ok) return;
    this.loading = true;
    this.error = null;
    this.besoinApi.delete(b.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => {
        console.error('[Besoins] delete error', err);
        this.error = 'Suppression échouée';
        this.loading = false;
      }
    });
  }

  // Open a modal listing all candidats (via propositions) for a given besoin
  openCandidats(b: Besoin): void {
    if (!b.id) return;
    this.selectedBesoin = b;
    this.loading = true;
    this.error = null;
    // Ouvre le modal immédiatement avec l'état "Chargement..."
    this.modal.open(this.candidatsForBesoinTpl, {
      backdrop: 'static',
      scrollable: true,
      // Slightly larger than XL, but not fullscreen on desktop
      modalDialogClass: 'modal-xxl modal-dialog-scrollable modal-fullscreen-md-down'
    });
    this.propositionsApi.getByBesoinId(b.id).subscribe({
      next: (list) => {
        const propositions = (list || []) as Proposition[];
        this.propositionsPourBesoin = propositions.map((p) => ({
          ...p,
          candidatName: formatCandidatName(p.candidat, p.candidatName),
          besoinLibelle: formatBesoinLabel(p.besoin, p.besoinLibelle)
        }));
        // Charger les fiches candidat complètes
        this.loadCandidatsDetailsForPropositions(this.propositionsPourBesoin);
        this.loading = false;
      },
      error: (err) => {
        console.error('[Besoins] openCandidats error', err);
        const status = err?.status;
        const msg = err?.error?.message || err?.message || 'Échec de chargement des candidats';
        this.error = status ? `${msg} (HTTP ${status})` : msg;
        this.loading = false;
      }
    });
  }



  displayCandidatFromProposition(p: Proposition): string {
    return formatCandidatName(p?.candidat, p?.candidatName) ?? '-';
  }

  private loadCandidatsDetailsForPropositions(list: Proposition[]): void {
    const ids = Array.from(new Set(
      list
        .map(p => extractCandidatId(p.candidat))
        .filter((id): id is number => typeof id === 'number')
    ));

    this.candidatsMap.clear();
    if (ids.length === 0) {
      return;
    }

    const calls = ids.map(id =>
      this.candidatsApi.getById(id).pipe(catchError(() => of<Candidat | null>(null)))
    );

    forkJoin(calls).subscribe(results => {
      results.forEach(c => {
        if (c && c.id != null) {
          this.candidatsMap.set(c.id, c);
        }
      });
    });
  }

  getCandidatDetails(p: Proposition): Candidat | null {
    const id = extractCandidatId(p.candidat);
    if (id == null) {
      return null;
    }
    return this.candidatsMap.get(id) ?? null;
  }

  openCandidatInfoFromList(p: Proposition): void {
    const id = extractCandidatId(p.candidat);
    if (!id) {
      return;
    }
    this.candidatsApi.getById(id).subscribe({
      next: (c) => {
        this.candidateDetail = c;
        this.modal.open(this.candidatInfoTpl, { size: 'lg', backdrop: 'static', scrollable: true, modalDialogClass: 'modal-lg modal-dialog-scrollable modal-fullscreen-sm-down' });
      },
      error: () => { this.error = 'Impossible de charger les informations du candidat'; }
    });
  }

  openCurrentBesoinInfo(): void {
    const id = this.selectedBesoin?.id;
    if (!id) return;
    this.besoinApi.getById(id).subscribe({
      next: (b) => { this.besoinDetail = b; this.modal.open(this.besoinInfoTpl, { size: 'lg', backdrop: 'static', scrollable: true, modalDialogClass: 'modal-lg modal-dialog-scrollable modal-fullscreen-sm-down' }); },
      error: () => { this.error = 'Impossible de charger les informations du besoin'; }
    });
  }

  // Update proposition status inline from the modal
  updatePropositionStatus(p: Proposition, newStatus: string): void {
    const propId = p.id;
    if (!propId) {
      return;
    }

    const previousStatus = p.statutQualif ?? null;
    const statutValue = newStatus && newStatus.trim() ? newStatus.trim() : null;
    p.statutQualif = statutValue;
    this.savingStatus[propId] = true;

    this.propositionsApi.updateStatus(propId, statutValue).subscribe({
      next: (saved) => {
        if (saved) {
          p.statutQualif = saved.statutQualif ?? statutValue ?? null;
          p.candidat = saved.candidat ?? p.candidat;
          p.besoin = saved.besoin ?? p.besoin;
          p.candidatName = formatCandidatName(p.candidat, p.candidatName);
          p.besoinLibelle = formatBesoinLabel(p.besoin, p.besoinLibelle);
        } else {
          p.statutQualif = statutValue;
        }
        this.propositionsPourBesoin = [...this.propositionsPourBesoin];
        delete this.savingStatus[propId];
      },
      error: (err) => {
        console.error('[Besoins] updatePropositionStatus error', err);
        this.error = err?.error?.message || 'Échec de mise à jour du statut';
        p.statutQualif = previousStatus;
        this.propositionsPourBesoin = [...this.propositionsPourBesoin];
        delete this.savingStatus[propId];
      }
    });
  }


  // Permissions helpers
  canView(): boolean { return this.auth.hasAuthority('BESOIN_READ') || this.auth.hasAuthority('CAN_VIEW'); }
  canCreate(): boolean { return this.auth.hasAuthority('BESOIN_CREATE') || this.auth.hasAuthority('BESOIN_UPDATE') || this.auth.hasAuthority('CAN_CREATE') || this.auth.hasAuthority('CAN_EDIT'); }
  canEdit(): boolean { return this.auth.hasAuthority('BESOIN_UPDATE') || this.auth.hasAuthority('CAN_EDIT'); }
  canDelete(): boolean { return this.auth.hasAuthority('BESOIN_DELETE') || this.auth.hasAuthority('CAN_DELETE'); }

  // UI helpers for badges
  colorClassFor(v?: number | null): string { return this.style.colorClassFor(v); }
  colorLabelFor(v?: number | null): string { return this.style.colorLabelFor(v); }
}

