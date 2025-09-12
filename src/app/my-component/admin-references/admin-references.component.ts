import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReferenceService, ReferenceType, ReferenceItem } from '../../my-service/reference.service';
import { AuthService } from '../../my-service/auth.service';
import { Perms, Roles } from '../../config/permissions';
import { ReferenceStyleService } from '../../my-service/reference-style.service';

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

  constructor(
    private readonly refs: ReferenceService,
    private readonly fb: FormBuilder,
    public readonly auth: AuthService,
    private readonly style: ReferenceStyleService,
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
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.refs.list(this.current).subscribe({
      next: d => { this.data = d || []; this.loading = false; },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  startCreate(): void {
    if (!this.canCreateCurrent()) return;
    this.editingId = null;
    this.isEditing = false;
    this.form.reset({ code: '', label: '', description: '', active: true, sortOrder: 1 });
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
      next: () => { this.editingId = null; this.load(); },
      error: () => { this.error = 'Opération échouée'; this.loading = false; }
    });
  }

  // Permissions par type
  canReadType(t: ReferenceType): boolean {
    if (this.auth.hasAuthority(Roles.Admin) || this.auth.hasAuthority(Roles.RefManager)) return true;
    switch (t) {
      case 'status': return this.auth.hasAuthority(Perms.Reference.Status.Read);
      case 'site': return this.auth.hasAuthority(Perms.Reference.Site.Read);
      case 'priority': return this.auth.hasAuthority(Perms.Reference.Priority.Read);
    }
  }

  canCreateCurrent(): boolean {
    if (this.auth.hasAuthority(Roles.Admin) || this.auth.hasAuthority(Roles.RefManager)) return true;
    switch (this.current) {
      case 'status': return this.auth.hasAuthority(Perms.Reference.Status.Create);
      case 'site': return this.auth.hasAuthority(Perms.Reference.Site.Create);
      case 'priority': return this.auth.hasAuthority(Perms.Reference.Priority.Create);
    }
  }

  canUpdateCurrent(): boolean {
    if (this.auth.hasAuthority(Roles.Admin) || this.auth.hasAuthority(Roles.RefManager)) return true;
    switch (this.current) {
      case 'status': return this.auth.hasAuthority(Perms.Reference.Status.Update);
      case 'site': return this.auth.hasAuthority(Perms.Reference.Site.Update);
      case 'priority': return this.auth.hasAuthority(Perms.Reference.Priority.Update);
    }
  }

  canDeleteCurrent(): boolean {
    if (this.auth.hasAuthority(Roles.Admin) || this.auth.hasAuthority(Roles.RefManager)) return true;
    switch (this.current) {
      case 'status': return this.auth.hasAuthority(Perms.Reference.Status.Delete);
      case 'site': return this.auth.hasAuthority(Perms.Reference.Site.Delete);
      case 'priority': return this.auth.hasAuthority(Perms.Reference.Priority.Delete);
    }
  }

  showActionsColumn(): boolean {
    return this.canUpdateCurrent() || this.canDeleteCurrent();
  }

  private selectFirstAllowedType(): void {
    const order: ReferenceType[] = ['status', 'site', 'priority'];
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
}

