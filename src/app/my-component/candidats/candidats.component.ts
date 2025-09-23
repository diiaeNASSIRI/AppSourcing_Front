import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Candidat, CandidatRequest } from '../../models/candidat.model';
import { CandidatServiceClient } from '../../my-service/candidat.service';
import { AuthService } from '../../my-service/auth.service';
import { TranslationService } from '../../config/i18n/translation.service';

@Component({
  selector: 'app-candidats',
  templateUrl: './candidats.component.html',
  styleUrls: ['./candidats.component.css']
})
export class CandidatsComponent implements OnInit {
  @ViewChild('candidatForm') formTpl!: TemplateRef<any>;

  candidats: Candidat[] = [];
  loading = false;
  error: string | null = null;

  form!: FormGroup;
  editingId: number | null = null;
  private modalRef?: NgbModalRef;
  

  // List UI
  page = 1;
  pageSize = 20;
  search = '';
  sortKey: 'firstName' | 'lastName' | 'profil' | 'pru' | 'experience' | 'dateDisponibilite' = 'lastName';
  sortDir: 'asc' | 'desc' = 'asc';

  // UI state: expanded links per candidate
  openLinksId: number | null = null;
  

  constructor(
    private readonly fb: FormBuilder,
    private readonly modal: NgbModal,
    private readonly api: CandidatServiceClient,
    public readonly auth: AuthService,
    private readonly translation: TranslationService
  ) {}

  private translate(key: string, params?: Record<string, unknown>): string {
    return this.translation.instant(key, params);
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      profil: ['', [Validators.required, Validators.maxLength(255)]],
      dateDisponibilite: [null],
  experience: [null], // expÃ©rience libre (string)
      pru: [null, [Validators.min(0)]],
      links: this.fb.array([]),
    });

    if (this.canView()) {
      this.loadAll();
    } else {
      this.error = 'AccÃ¨s refusÃ© (permission CAN_VIEW requise)';
    }
  }

  // Helpers for links form array
  get linksFa(): FormArray { return this.form.get('links') as FormArray; }

  newLinkGroup(label = '', path = ''): FormGroup {
    return this.fb.group({
      label: [label, [Validators.required, Validators.maxLength(255)]],
      path: [path, [Validators.required, Validators.maxLength(2048)]],
    });
  }

  addLinkRow(): void { this.linksFa.push(this.newLinkGroup()); }
  removeLinkRow(i: number): void { this.linksFa.removeAt(i); }

  // Data ops
  loadAll(): void {
    this.loading = true;
    this.error = null;
    this.api.getAll().subscribe({
      next: (data) => {
        const arr = (data ?? []) as any[];
  this.candidats = arr.map((c: any) => ({ ...c })); // laisser tel quel (string)
        this.loading = false;
      },
      error: (err) => {
        console.error('[Candidats] loadAll error', err);
        this.error = err?.error?.message || 'Ã‰chec du chargement';
        this.loading = false;
      }
    });
  }

  startCreate(): void {
    if (!this.canCreate()) return;
  this.form.reset({ firstName: '', lastName: '', profil: '', dateDisponibilite: null, experience: null, pru: null });
    this.linksFa.clear();
    this.editingId = null;
    this.modalRef = this.modal.open(this.formTpl, { size: 'lg', centered: true, backdrop: 'static' });
  }

  startEdit(c: Candidat): void {
    if (!this.canEdit()) return;
    this.form.reset({
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      profil: c.profil ?? '',
      dateDisponibilite: c.dateDisponibilite ?? null,
  experience: c.experience ?? null,
      pru: c.pru ?? null,
    });
    this.linksFa.clear();
    (c.links || []).forEach(l => this.linksFa.push(this.newLinkGroup(l.label, l.path)));
    this.editingId = c.id ?? null;
    this.modalRef = this.modal.open(this.formTpl, { size: 'lg', centered: true, backdrop: 'static' });
  }

  cancelForm(): void {
    this.editingId = null;
    this.modalRef?.dismiss();
  }

  submit(): void {
    if (this.form.invalid) return;
    const payload: CandidatRequest = {
      ...this.form.value,
      links: (this.linksFa.value || []).length > 0 ? this.linksFa.value : null,
    };

    this.loading = true;
    const obs = this.editingId != null ? this.api.update(this.editingId, payload) : this.api.create(payload);
    obs.subscribe({
      next: () => {
        this.loadAll();
        this.modalRef?.close();
      },
      error: (err) => {
        console.error('[Candidats] submit error', err);
        this.error = err?.error?.message || this.translate('candidats.errors.save');
        this.loading = false;
      }
    });
  }

  remove(c: Candidat): void {
    if (!this.canDelete() || !c.id) return;
    const ok = confirm(this.translate('candidats.confirm.delete', { name: this.fullName(c) }));
    if (!ok) return;
    this.loading = true;
    this.api.delete(c.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => {
        console.error('[Candidats] delete error', err);
        this.error = this.translate('candidats.errors.deleteFailed');
        this.loading = false;
      }
    });
  }

  private fullName(c: Candidat): string {
    const first = (c.firstName || '').trim();
    const last = (c.lastName || '').trim();
    const parts = [first, last].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return (c.profil || '').trim();
  }

  // List helpers
  get filtered(): Candidat[] {
    const q = (this.search || '').trim().toLowerCase();
    if (!q) return this.candidats;
    return this.candidats.filter(c =>
      (c.firstName || '').toLowerCase().includes(q) ||
      (c.lastName || '').toLowerCase().includes(q) ||
      (c.profil || '').toLowerCase().includes(q) ||
  ((c.experience != null ? String(c.experience) : '')).toLowerCase().includes(q)
    );
  }

  get sorted(): Candidat[] {
    const arr = [...this.filtered];
    const k = this.sortKey;
    const d = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a: any, b: any) => {
  if (k === 'pru') { // experience n'est plus tri numÃ©rique
        const av = Number(a?.[k] ?? 0);
        const bv = Number(b?.[k] ?? 0);
        return (av - bv) * d;
      }
      const av = (a?.[k] ?? '').toString().toLowerCase();
      const bv = (b?.[k] ?? '').toString().toLowerCase();
      if (av < bv) return -1 * d;
      if (av > bv) return 1 * d;
      return 0;
    });
    return arr;
  }

  get pageItems(): Candidat[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  setSort(key: 'firstName' | 'lastName' | 'profil' | 'pru' | 'experience' | 'dateDisponibilite'): void {
    if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortKey = key; this.sortDir = 'asc'; }
  }

  // Links expand/collapse
  isLinksOpen(c: Candidat): boolean {
    const id = c.id ?? -1;
    return id !== -1 && this.openLinksId === id;
  }

  toggleLinks(c: Candidat): void {
    const id = c.id ?? -1;
    if (id === -1) return;
    this.openLinksId = this.openLinksId === id ? null : id;
  }

  // Notes removed

  // Permissions
  canView(): boolean { return this.auth.hasAuthority('CANDIDAT_READ') || this.auth.hasAuthority('CAN_VIEW'); }
  canCreate(): boolean {
    return this.auth.hasAuthority('CANDIDAT_CREATE') || this.auth.hasAuthority('CANDIDAT_UPDATE') ||
           this.auth.hasAuthority('CAN_CREATE') || this.auth.hasAuthority('CAN_EDIT');
  }
  canEdit(): boolean { return this.auth.hasAuthority('CANDIDAT_UPDATE') || this.auth.hasAuthority('CAN_EDIT'); }
  canDelete(): boolean { return this.auth.hasAuthority('CANDIDAT_DELETE') || this.auth.hasAuthority('CAN_DELETE'); }
  // CV upload/download removed
}

