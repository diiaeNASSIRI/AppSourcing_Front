import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Proposition, PropositionRequest } from '../../models/proposition.model';
import { PropositionServiceClient } from '../../my-service/proposition.service';
import { CandidatServiceClient } from '../../my-service/candidat.service';
import { BesoinServiceClient } from '../../my-service/besoin.service';
import { AuthService } from '../../my-service/auth.service';

@Component({
  selector: 'app-propositions',
  templateUrl: './propositions.component.html',
  styleUrls: ['./propositions.component.css']
})
export class PropositionsComponent implements OnInit, OnDestroy {
  items: Proposition[] = [];
  loading = false;
  error: string | null = null;
  formError: string | null = null;

  editingId: number | null = null;
  modalRef?: NgbModalRef;

  // Lookups for simple selection
  candidats: Array<{ id: number; label: string }> = [];
  besoins: Array<{ id: number; label: string }> = [];

  form = this.fb.group({
    candidatId: [null as number | null, [Validators.required]],
    besoinId: [null as number | null, [Validators.required]],
    dateProposition: [''],
  delaiReponse: [''],
    datePropale: [''],
    dateDemarrage: [''],
  statutQualif: [''],
  });

  // Table UI state (aligné sur besoins/candidats)
  page = 1;
  pageSize = 20;
  search = '';
  sortKey: 'id' | 'candidatName' | 'besoinLibelle' | 'dateProposition' | 'delaiReponse' | 'datePropale' | 'dateDemarrage' | 'statutQualif' = 'id';
  sortDir: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();

  @ViewChild('propForm') propFormTpl?: TemplateRef<any>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly modal: NgbModal,
    private readonly api: PropositionServiceClient,
    private readonly candidatsApi: CandidatServiceClient,
    private readonly besoinsApi: BesoinServiceClient,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  this.loadLookups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  canCreate(): boolean { return this.auth.hasAny('ADMIN','CAN_CREATE','CAN_EDIT'); }
  canEdit(): boolean { return this.auth.hasAny('ADMIN','CAN_EDIT'); }
  canDelete(): boolean { return this.auth.hasAny('ADMIN','CAN_DELETE'); }

  trackById(_: number, it: Proposition) { return it.id; }

  loadAll() {
    this.loading = true; this.error = null;
    this.api.getAll().subscribe({
      next: (res) => {
        const list = res || [];
        // compute convenience fields for UI
        this.items = list.map((p) => ({
          ...p,
          candidatName: this.labelForCandidat((p as any).candidat, (p as any).candidatName),
          besoinLibelle: this.labelForBesoin((p as any).besoin, (p as any).besoinLibelle),
        }));
  // si la page courante dépasse après rafraîchissement, revenir à 1
  const total = this.filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
  if (this.page > maxPage) this.page = 1;
      },
      error: (err) => { this.error = err?.error?.message || 'Erreur de chargement'; },
      complete: () => { this.loading = false; }
    });
  }

  // Helpers to build labels even when backend sends only IDs (Jackson @JsonIdentityInfo)
  private labelForCandidat(candidat: any, fallback?: string | null): string | null {
    if (candidat == null) return fallback ?? null;
    // If backend sent just an id (number) or a minimal object
    if (typeof candidat === 'number') return `Candidat #${candidat}`;
    const first = (candidat.firstName ?? '').toString().trim();
    const last = (candidat.lastName ?? '').toString().trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    if (candidat.id != null) return `Candidat #${candidat.id}`;
    return fallback ?? null;
  }

  private labelForBesoin(besoin: any, fallback?: string | null): string | null {
    if (besoin == null) return fallback ?? null;
    if (typeof besoin === 'number') return `Besoin #${besoin}`;
    const libelle = (besoin.libelle ?? '').toString().trim();
    if (libelle) return libelle;
    if (besoin.id != null) return `Besoin #${besoin.id}`;
    return fallback ?? null;
  }

  loadLookups() {
    this.candidatsApi.getAll().pipe(takeUntil(this.destroy$)).subscribe(list => {
      this.candidats = (list || [])
        .filter(c => c && c.id != null)
        .map(c => ({ id: c.id!, label: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || `Candidat #${c.id}` }));
    });
    this.besoinsApi.getAll().pipe(takeUntil(this.destroy$)).subscribe(list => {
      this.besoins = (list || [])
        .filter(b => b && b.id != null)
        .map(b => ({ id: b.id!, label: (b as any).libelle || `Besoin #${b.id}` }));
    });
  }

  startCreate() {
    this.editingId = null;
    this.form.reset({
      candidatId: null,
      besoinId: null,
      dateProposition: '',
      delaiReponse: '',
      datePropale: '',
      dateDemarrage: '',
      statutQualif: ''
    });
  this.formError = null;
    this.loadLookups();
    this.openForm();
  }

  startEdit(p: Proposition) {
    this.editingId = p.id ?? null;
    this.form.patchValue({
  candidatId: (p as any).candidatId ?? (p.candidat as any)?.id ?? null,
  besoinId: (p as any).besoinId ?? (p.besoin as any)?.id ?? null,
      dateProposition: p.dateProposition ?? '',
      delaiReponse: p.delaiReponse ?? '',
      datePropale: p.datePropale ?? '',
      dateDemarrage: p.dateDemarrage ?? '',
      statutQualif: p.statutQualif ?? ''
    });
  this.formError = null;
    this.loadLookups();
    this.openForm();
  }

  openForm() {
    if (!this.propFormTpl) return;
  this.formError = null;
    this.modalRef = this.modal.open(this.propFormTpl, { backdrop: 'static', size: 'lg' });
  }

  cancelForm() {
    this.modalRef?.close();
  }

  // Removed stepper/search logic; using simple dropdowns now

  remove(p: Proposition) {
    if (!p.id) return;
    if (!confirm('Supprimer cette proposition ?')) return;
    this.api.delete(p.id).subscribe({ next: () => this.loadAll() });
  }

  removeAll() {
    if (!confirm('Supprimer toutes les propositions ?')) return;
    this.api.deleteAll().subscribe({ next: () => this.loadAll() });
  }

  submit() {
    if (this.form.invalid) return;

    const candidatId = Number(this.form.value.candidatId);
    const besoinId = Number(this.form.value.besoinId);
    if (!candidatId || !besoinId) { this.formError = 'Veuillez sélectionner un candidat et un besoin.'; return; }

    const payload: PropositionRequest = {
      candidatId,
      besoinId,
      dateProposition: this.form.value.dateProposition || null,
      delaiReponse: this.form.value.delaiReponse || null,
      datePropale: this.form.value.datePropale || null,
  dateDemarrage: this.form.value.dateDemarrage || null,
  statutQualif: this.form.value.statutQualif || null,
    };

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
  next: () => { this.modalRef?.close(); this.loadAll(); },
  error: (err) => { this.formError = err?.error?.message || 'Erreur lors de la sauvegarde'; }
    });
  }

  // computeIds and canSubmit removed

  // ================= Table helpers (comme besoins / candidats) =================
  get filtered(): Proposition[] {
    const q = (this.search || '').trim().toLowerCase();
    if (!q) return this.items;
    return this.items.filter(p => (
      (String(p.id ?? '')).includes(q) ||
      (p as any).candidatName?.toLowerCase().includes(q) ||
      (p as any).besoinLibelle?.toLowerCase().includes(q) ||
      (p.dateProposition || '').toLowerCase().includes(q) ||
      (p.delaiReponse || '').toLowerCase().includes(q) ||
      (p.datePropale || '').toLowerCase().includes(q) ||
      (p.dateDemarrage || '').toLowerCase().includes(q) ||
      (p.statutQualif || '').toLowerCase().includes(q)
    ));
  }

  get sorted(): Proposition[] {
    const arr = [...this.filtered];
    const k = this.sortKey;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a: any, b: any) => {
      if (k === 'id') {
        const av = Number(a.id ?? 0);
        const bv = Number(b.id ?? 0);
        return (av - bv) * dir;
      }
      const av = (a?.[k] ?? '').toString().toLowerCase();
      const bv = (b?.[k] ?? '').toString().toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }

  get pageItems(): Proposition[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  get totalItems(): number { return this.filtered.length; }

  setSort(key: typeof this.sortKey) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
  }
}
