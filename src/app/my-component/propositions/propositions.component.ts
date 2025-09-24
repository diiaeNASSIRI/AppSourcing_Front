import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Proposition, PropositionRequest, extractCandidatId, extractBesoinId, formatCandidatName, formatBesoinLabel } from '../../models/proposition.model';
import { Candidat } from '../../models/candidat.model';
import { Besoin, RefItem } from '../../models/besoin.model';
import { PropositionServiceClient } from '../../my-service/proposition.service';
import { CandidatServiceClient } from '../../my-service/candidat.service';
import { BesoinServiceClient } from '../../my-service/besoin.service';
import { ReferenceService } from '../../my-service/reference.service';
import { AuthService } from '../../my-service/auth.service';
import { TranslationService } from '../../config/i18n/translation.service';

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

  statutQualifs: RefItem[] = [];

  form = this.fb.group({
    candidatId: [null as number | null, [Validators.required]],
    besoinId: [null as number | null, [Validators.required]],
    dateProposition: [''],
    delaiReponse: [''],
    datePropale: [''],
    dateDemarrage: [''],
    statutQualifId: [null as number | null],
  });

  // Table UI state (alignÃ© sur besoins/candidats)
  page = 1;
  pageSize = 20;
  search = '';
  sortKey: 'id' | 'candidatName' | 'besoinLibelle' | 'dateProposition' | 'delaiReponse' | 'datePropale' | 'dateDemarrage' | 'statutQualif' = 'id';
  sortDir: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();

  @ViewChild('propForm') propFormTpl?: TemplateRef<any>;
  @ViewChild('propDetail') propDetailTpl?: TemplateRef<any>;
  @ViewChild('candidatInfo') candidatInfoTpl?: TemplateRef<any>;
  @ViewChild('besoinInfo') besoinInfoTpl?: TemplateRef<any>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly modal: NgbModal,
    private readonly api: PropositionServiceClient,
    private readonly candidatsApi: CandidatServiceClient,
    private readonly besoinsApi: BesoinServiceClient,
    private readonly refs: ReferenceService,
    private readonly auth: AuthService,
    private readonly translation: TranslationService
  ) {}

  private translate(key: string, params?: Record<string, unknown>): string {
    return this.translation.instant(key, params);
  }

  ngOnInit(): void {
    this.loadAll();
    this.loadLookups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  canCreate(): boolean { return this.auth.hasAny('ADMIN','PROPOSITION_CREATE','PROPOSITION_EDIT','CAN_CREATE','CAN_EDIT'); }
  canEdit(): boolean { return this.auth.hasAny('ADMIN','PROPOSITION_EDIT','CAN_EDIT'); }
  canDelete(): boolean { return this.auth.hasAny('ADMIN','PROPOSITION_DELETE','CAN_DELETE'); }

  trackById(_: number, it: Proposition) { return it.id; }

  loadAll() {
    this.loading = true; this.error = null;
    this.api.getAll().subscribe({
      next: (res) => {
        const list = res || [];
        // compute convenience fields for UI
        this.items = list.map((p) => ({
          ...p,
          candidatName: this.labelForCandidat(p.candidat, p.candidatName),
          besoinLibelle: this.labelForBesoin(p.besoin, p.besoinLibelle),
          statutQualif: this.labelForStatut(p.statutQualifId ?? null, p.statutQualif),
        }));
  // si la page courante dÃ©passe aprÃ¨s rafraÃ®chissement, revenir Ã  1
  const total = this.filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
  if (this.page > maxPage) this.page = 1;
      },
      error: (err) => { this.error = err?.error?.message || this.translate('propositions.errors.load'); },
      complete: () => { this.loading = false; }
    });
  }

  // Helpers to build labels even when backend sends only IDs (Jackson @JsonIdentityInfo)
  private labelForCandidat(candidat: Proposition['candidat'], fallback?: string | null): string | null {
    return formatCandidatName(candidat, fallback);
  }

  private labelForBesoin(besoin: Proposition['besoin'], fallback?: string | null): string | null {
    return formatBesoinLabel(besoin, fallback);
  }

  private labelForStatut(id: number | null | undefined, fallback?: string | null): string | null {
    if (id == null) {
      return fallback ?? null;
    }
    const found = this.statutQualifs.find((s) => s.id === id);
    const label = found?.label?.toString().trim();
    return label && label.length > 0 ? label : (fallback ?? null);
  }

  private applyStatutLabels(): void {
    this.items = this.items.map((p) => ({
      ...p,
      statutQualif: this.labelForStatut(p.statutQualifId ?? null, p.statutQualif),
    }));
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
        .map(b => ({ id: b.id!, label: b.libelle || `Besoin #${b.id}` }));
    });
    this.refs.list('statut-qualification').pipe(takeUntil(this.destroy$)).subscribe(list => {
      const arr = (list || []).filter(r => r && r.id != null) as RefItem[];
      arr.sort((a, b) => {
        const ao = Number(a.sortOrder ?? 0);
        const bo = Number(b.sortOrder ?? 0);
        if (ao !== bo) {
          return ao - bo;
        }
        const al = (a.label || '').toString().toLowerCase();
        const bl = (b.label || '').toString().toLowerCase();
        return al.localeCompare(bl);
      });
      this.statutQualifs = arr;
      this.applyStatutLabels();
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
      statutQualifId: null
    });
  this.formError = null;
      this.loadLookups();
    this.openForm();
  }

  startEdit(p: Proposition) {
    this.editingId = p.id ?? null;
    this.form.patchValue({
      candidatId: extractCandidatId(p.candidat),
      besoinId: extractBesoinId(p.besoin),
      dateProposition: p.dateProposition ?? '',
      delaiReponse: p.delaiReponse ?? '',
      datePropale: p.datePropale ?? '',
      dateDemarrage: p.dateDemarrage ?? '',
      statutQualifId: p.statutQualifId ?? null
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

  // Detail modal
  detailItem?: Proposition;
  openDetail(p: Proposition) {
    this.detailItem = p;
    // also load full candidate/besoin details for side-by-side view
    this.candidateDetail = undefined;
    this.besoinDetail = undefined;
    const candId = extractCandidatId(p.candidat);
    const besId = extractBesoinId(p.besoin);

    const candidate$ = candId
      ? this.candidatsApi.getById(candId).pipe(catchError(() => of<Candidat | null>(null)))
      : of<Candidat | null>(null);
    const besoin$ = besId
      ? this.besoinsApi.getById(besId).pipe(catchError(() => of<Besoin | null>(null)))
      : of<Besoin | null>(null);

    forkJoin([candidate$, besoin$]).pipe(takeUntil(this.destroy$)).subscribe(([c, b]) => {
      this.candidateDetail = c || undefined;
      this.besoinDetail = b || undefined;
    });

    if (!this.propDetailTpl) return;
    this.modal.open(this.propDetailTpl, {
      backdrop: 'static',
      size: 'xl',
      scrollable: true,
      modalDialogClass: 'modal-xl modal-dialog-scrollable modal-fullscreen-md-down'
    });
  }

  displayCandidat(p?: Proposition): string {
    if (!p) {
      return '-';
    }
    return p.candidatName ?? formatCandidatName(p.candidat, p.candidatName) ?? '-';
  }

  displayBesoin(p?: Proposition): string {
    if (!p) {
      return '-';
    }
    return p.besoinLibelle ?? formatBesoinLabel(p.besoin, p.besoinLibelle) ?? '-';
  }

  // Removed stepper/search logic; using simple dropdowns now

  remove(p: Proposition) {
    if (!p.id) return;
    if (!confirm(this.translate('propositions.confirm.deleteOne'))) return;
    this.api.delete(p.id).subscribe({ next: () => this.loadAll() });
  }

  removeAll() {
    if (!confirm(this.translate('propositions.confirm.deleteAll'))) return;
    this.api.deleteAll().subscribe({ next: () => this.loadAll() });
  }

  submit() {
    if (this.form.invalid) return;

    const candidatId = Number(this.form.value.candidatId);
    const besoinId = Number(this.form.value.besoinId);
    if (!candidatId || !besoinId) { this.formError = 'Veuillez sÃ©lectionner un candidat et un besoin.'; return; }

    const statutQualifId = this.form.value.statutQualifId != null ? Number(this.form.value.statutQualifId) : null;
    const payload: PropositionRequest = {
      candidatId,
      besoinId,
      dateProposition: this.form.value.dateProposition || null,
      delaiReponse: this.form.value.delaiReponse || null,
      datePropale: this.form.value.datePropale || null,
  dateDemarrage: this.form.value.dateDemarrage || null,
  statutQualifId: statutQualifId,
    };

    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req$.subscribe({
  next: () => { this.modalRef?.close(); this.loadAll(); },
  error: (err) => { this.formError = err?.error?.message || this.translate('propositions.errors.save'); }
    });
  }

  // computeIds and canSubmit removed

  // ================= Table helpers (comme besoins / candidats) =================
  get filtered(): Proposition[] {
    const q = (this.search || '').trim().toLowerCase();
    if (!q) return this.items;
    return this.items.filter(p => (
      (String(p.id ?? '')).includes(q) ||
      p.candidatName?.toLowerCase().includes(q) ||
      p.besoinLibelle?.toLowerCase().includes(q) ||
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

  // --- Show Candidat/Besoin info from the form selections ---
  candidateDetail?: Candidat;
  besoinDetail?: Besoin;

  openCandidatInfo() {
    const id = Number(this.form.value.candidatId);
    if (!id) { this.form.get('candidatId')?.markAsTouched(); return; }
    this.candidatsApi.getById(id).subscribe({
      next: (c) => { this.candidateDetail = c; if (this.candidatInfoTpl) this.modal.open(this.candidatInfoTpl, { size: 'lg', backdrop: 'static', scrollable: true, modalDialogClass: 'modal-lg modal-dialog-scrollable modal-fullscreen-sm-down' }); },
      error: () => { this.formError = this.translate('propositions.errors.candidatInfo'); }
    });
  }

  openBesoinInfo() {
    const id = Number(this.form.value.besoinId);
    if (!id) { this.form.get('besoinId')?.markAsTouched(); return; }
    this.besoinsApi.getById(id).subscribe({
      next: (b) => { this.besoinDetail = b; if (this.besoinInfoTpl) this.modal.open(this.besoinInfoTpl, { size: 'lg', backdrop: 'static', scrollable: true, modalDialogClass: 'modal-lg modal-dialog-scrollable modal-fullscreen-sm-down' }); },
      error: () => { this.formError = this.translate('propositions.errors.besoinInfo'); }
    });
  }

  fullName(c?: Partial<Candidat> | null): string {
    if (!c) return '-';
    const f = (c.firstName || '').toString().trim();
    const l = (c.lastName || '').toString().trim();
    return (f || l) ? `${f} ${l}`.trim() : (c.id != null ? `Candidat #${c.id}` : '-');
  }
}


