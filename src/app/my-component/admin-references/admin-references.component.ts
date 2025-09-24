import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReferenceService, ReferenceType, ReferenceItem } from '../../my-service/reference.service';
import { AuthService } from '../../my-service/auth.service';
import { Perms, Roles } from '../../config/permissions';
import { ReferenceStyleService } from '../../my-service/reference-style.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-admin-references',
  templateUrl: './admin-references.component.html',
  styleUrls: ['./admin-references.component.css']
})
export class AdminReferencesComponent implements OnInit {
  current: ReferenceType = 'status';
  data: ReferenceItem[] = [];
  loading = false;
  error: string | null = null;

  form!: FormGroup;
  editingId: number | null = null;
  isEditing = false;

  // UI list state (comme autres interfaces)
  page = 1;
  pageSize = 20;
  search = '';
  sortKey: 'code' | 'label' | 'active' | 'sortOrder' = 'label';
  sortDir: 'asc' | 'desc' = 'asc';

  private modalRef?: NgbModalRef;
  @ViewChild('refForm') refFormTpl?: TemplateRef<any>;

  constructor(
    private readonly refs: ReferenceService,
    private readonly fb: FormBuilder,
    public readonly auth: AuthService,
  private readonly style: ReferenceStyleService,
  private readonly modal: NgbModal,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      label: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      active: [true],
      sortOrder: [1]
    });

    this.form.get('label')!.valueChanges.subscribe(v => {
      if (!this.isEditing) {
        const slug = this.slugify(v || '');
        this.form.get('code')!.setValue(slug, { emitEvent: false });
      }
    });

    if (!this.canReadType(this.current)) {
      this.selectFirstAllowedType();
    }
    this.load();
  }

  setType(t: ReferenceType): void {
    if (!this.canReadType(t)) return;
    this.current = t;
    this.editingId = null;
    this.isEditing = false;
    this.form.reset({ code: '', label: '', description: '', active: true, sortOrder: 1 });
  this.page = 1;
  this.search = '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.refs.list(this.current).subscribe({
      next: d => {
        this.data = d || [];
        // réajuster la page si nécessaire
        const total = this.filtered.length;
        const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
        if (this.page > maxPage) this.page = 1;
        this.loading = false;
      },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  startCreate(): void {
    if (!this.canCreateCurrent()) return;
    this.editingId = null;
    this.isEditing = false;
    this.form.reset({ code: '', label: '', description: '', active: true, sortOrder: 1 });
    this.openForm();
  }

  startEdit(item: ReferenceItem): void {
    if (!this.canUpdateCurrent()) return;
    this.editingId = item.id ?? null;
    this.isEditing = true;
    this.form.reset({
      code: item.code,
      label: item.label,
      description: item.description || '',
      active: item.active ?? true,
      sortOrder: item.sortOrder ?? 1
    });
    this.openForm();
  }

  remove(item: ReferenceItem): void {
    if (!item.id) return;
    if (!this.canDeleteCurrent()) return;
    if (!confirm(`Supprimer "${item.label}" ?`)) return;
    this.loading = true;
    this.refs.delete(this.current, item.id).subscribe({
      next: () => this.load(),
      error: () => { this.error = 'Suppression échouée'; this.loading = false; }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    if (this.editingId ? !this.canUpdateCurrent() : !this.canCreateCurrent()) return;
    this.loading = true;
    const payload = this.form.value as Partial<ReferenceItem>;
    const obs = this.editingId
      ? this.refs.update(this.current, this.editingId!, payload)
      : this.refs.create(this.current, payload);
    obs.subscribe({
      next: () => { this.editingId = null; this.closeForm(); this.load(); },
      error: () => { this.error = 'Opération échouée'; this.loading = false; }
    });
  }

  openForm(): void {
    if (!this.refFormTpl) return;
    this.modalRef = this.modal.open(this.refFormTpl, { size: 'lg', backdrop: 'static', centered: true });
  }

  closeForm(): void { this.modalRef?.close(); }
  cancelForm(): void { this.editingId = null; this.isEditing = false; this.closeForm(); }

  // =================== Table helpers =====================
  get filtered(): ReferenceItem[] {
    const q = (this.search || '').trim().toLowerCase();
    if (!q) return this.data;
    return this.data.filter(r => (
      (r.code || '').toLowerCase().includes(q) ||
      (r.label || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      this.colorLabelFor(r.sortOrder)?.toLowerCase().includes(q)
    ));
  }

  get sorted(): ReferenceItem[] {
    const arr = [...this.filtered];
    const k = this.sortKey;
    const d = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a: any, b: any) => {
      if (k === 'active' || k === 'sortOrder') {
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

  get pageItems(): ReferenceItem[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  get totalItems(): number { return this.filtered.length; }

  setSort(key: typeof this.sortKey): void {
    if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortKey = key; this.sortDir = 'asc'; }
  }

  // Permissions par type
  canReadType(t: ReferenceType): boolean {
    if (this.auth.hasAuthority(Roles.Admin) || this.auth.hasAuthority(Roles.RefManager)) return true;
    switch (t) {
      case 'status': return this.auth.hasAuthority(Perms.Reference.Status.Read);
      case 'site': return this.auth.hasAuthority(Perms.Reference.Site.Read);
      case 'priority': return this.auth.hasAuthority(Perms.Reference.Priority.Read);
      case 'statut-qualification': return this.auth.hasAuthority(Perms.Reference.StatutQualification.Read);
    }
  }

  canCreateCurrent(): boolean {
    if (this.auth.hasAuthority(Roles.Admin) || this.auth.hasAuthority(Roles.RefManager)) return true;
    switch (this.current) {
      case 'status': return this.auth.hasAuthority(Perms.Reference.Status.Create);
      case 'site': return this.auth.hasAuthority(Perms.Reference.Site.Create);
      case 'priority': return this.auth.hasAuthority(Perms.Reference.Priority.Create);
      case 'statut-qualification': return this.auth.hasAuthority(Perms.Reference.StatutQualification.Create);
    }
  }

  canUpdateCurrent(): boolean {
    if (this.auth.hasAuthority(Roles.Admin) || this.auth.hasAuthority(Roles.RefManager)) return true;
    switch (this.current) {
      case 'status': return this.auth.hasAuthority(Perms.Reference.Status.Update);
      case 'site': return this.auth.hasAuthority(Perms.Reference.Site.Update);
      case 'priority': return this.auth.hasAuthority(Perms.Reference.Priority.Update);
      case 'statut-qualification': return this.auth.hasAuthority(Perms.Reference.StatutQualification.Update);
    }
  }

  canDeleteCurrent(): boolean {
    if (this.auth.hasAuthority(Roles.Admin) || this.auth.hasAuthority(Roles.RefManager)) return true;
    switch (this.current) {
      case 'status': return this.auth.hasAuthority(Perms.Reference.Status.Delete);
      case 'site': return this.auth.hasAuthority(Perms.Reference.Site.Delete);
      case 'priority': return this.auth.hasAuthority(Perms.Reference.Priority.Delete);
      case 'statut-qualification': return this.auth.hasAuthority(Perms.Reference.StatutQualification.Delete);
    }
  }

  showActionsColumn(): boolean {
    return this.canUpdateCurrent() || this.canDeleteCurrent();
  }

  private selectFirstAllowedType(): void {
    const order: ReferenceType[] = ['status', 'site', 'priority', 'statut-qualification'];
    const found = order.find((t) => this.canReadType(t));
    this.current = found ?? 'status';
  }

  private slugify(input: string): string {
    return (input || '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }

  // Couleur: helpers d’affichage
  colorClassFor(v?: number | null): string { return this.style.colorClassFor(v); }
  colorLabelFor(v?: number | null): string { return this.style.colorLabelFor(v); }

  // Description courte affichée dans l'UI pour expliquer l'usage du référentiel courant
  get typeDescription(): string {
    switch (this.current) {
      case 'status':
  return 'Statuts utilisés dans l\'interface Besoins (colonne Statut).';
      case 'site':
  return 'Sites utilisés dans l\'interface Besoins (localisation / centre).';
      case 'priority':
  return 'Priorités utilisées dans l\'interface Besoins.';
      case 'statut-qualification':
  return 'Statuts de qualification utilisés pour les propositions.';
      default:
        return '';
    }
  }

  // Libellé lisible (pluriel) pour affichage dans le header / modal
  get currentLabel(): string {
    switch (this.current) {
      case 'status': return 'Statuts';
      case 'site': return 'Sites';
      case 'priority': return 'Priorités';
      case 'statut-qualification': return 'Statuts de qualification';
      default: return this.current;
    }
  }
}

