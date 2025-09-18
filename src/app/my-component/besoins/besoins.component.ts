import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Besoin, BesoinRequest, RefItem } from '../../models/besoin.model';
import { BesoinServiceClient } from '../../my-service/besoin.service';
import { AuthService } from '../../my-service/auth.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ReferenceStyleService } from '../../my-service/reference-style.service';
import { ReferenceService, ReferenceType } from '../../my-service/reference.service';

@Component({
  selector: 'app-besoins',
  templateUrl: './besoins.component.html',
  styleUrls: ['./besoins.component.css']
})
export class BesoinsComponent implements OnInit {
  @ViewChild('besoinForm') besoinFormTpl!: TemplateRef<any>;

  besoins: Besoin[] = [];
  loading = false;
  error: string | null = null;

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
    private readonly refs: ReferenceService,
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
    const arr = [...this.filteredBesoins];
    const k = this.sortKey;
    const d = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a: any, b: any) => {
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
    return arr;
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
    load('status', (a) => this.refStatus = a);
    load('site', (a) => this.refSites = a);
    load('priority', (a) => this.refPriorities = a);
  }

  loadAll(): void {
    this.loading = true;
    this.error = null;
    this.besoinApi.getAll().subscribe({
      next: (data) => {
        this.besoins = data ?? [];
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

  // Permissions helpers
  canView(): boolean { return this.auth.hasAuthority('BESOIN_READ') || this.auth.hasAuthority('CAN_VIEW'); }
  canCreate(): boolean { return this.auth.hasAuthority('BESOIN_CREATE') || this.auth.hasAuthority('BESOIN_UPDATE') || this.auth.hasAuthority('CAN_CREATE') || this.auth.hasAuthority('CAN_EDIT'); }
  canEdit(): boolean { return this.auth.hasAuthority('BESOIN_UPDATE') || this.auth.hasAuthority('CAN_EDIT'); }
  canDelete(): boolean { return this.auth.hasAuthority('BESOIN_DELETE') || this.auth.hasAuthority('CAN_DELETE'); }

  // UI helpers for badges
  colorClassFor(v?: number | null): string { return this.style.colorClassFor(v); }
  colorLabelFor(v?: number | null): string { return this.style.colorLabelFor(v); }
}
