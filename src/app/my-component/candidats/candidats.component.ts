import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Candidat, CandidatRequest } from '../../models/candidat.model';
import { NoteResponse } from '../../models/note.model';
import { CandidatServiceClient } from '../../my-service/candidat.service';
import { NoteServiceClient } from '../../my-service/note.service';
import { AuthService } from '../../my-service/auth.service';

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
  selectedCvFile: File | null = null;
  cvError: string | null = null;

  private readonly maxCvBytes = 10 * 1024 * 1024; // 10MB
  private readonly allowedCvExt = new Set(['pdf','doc','docx']);

  // List UI
  page = 1;
  pageSize = 20;
  search = '';
  sortKey: 'firstName' | 'lastName' | 'profil' | 'pru' | 'experience' | 'dateDisponibilite' = 'lastName';
  sortDir: 'asc' | 'desc' = 'asc';

  // UI state: expanded links per candidate
  openLinksId: number | null = null;
  // Notes UI state
  openNotesId: number | null = null;
  notesByCandidat: Record<number, NoteResponse[]> = {};
  notesLoading: Record<number, boolean> = {};
  notesError: Record<number, string | null> = {};
  noteText: Record<number, string> = {};
  notePublic: Record<number, boolean> = {};

  constructor(
    private readonly fb: FormBuilder,
    private readonly modal: NgbModal,
    private readonly api: CandidatServiceClient,
    private readonly notesApi: NoteServiceClient,
    public readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      profil: ['', [Validators.required, Validators.maxLength(255)]],
      dateDisponibilite: [null],
      experience: [null, [Validators.min(0)]],
      pru: [null, [Validators.min(0)]],
      links: this.fb.array([]),
    });

    if (this.canView()) {
      this.loadAll();
    } else {
      this.error = 'Accès refusé (permission CAN_VIEW requise)';
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
        this.candidats = arr.map((c: any) => ({
          ...c,
          experience: c?.experience != null ? Number(c.experience) : null,
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('[Candidats] loadAll error', err);
        this.error = err?.error?.message || 'Échec du chargement';
        this.loading = false;
      }
    });
  }

  startCreate(): void {
    if (!this.canCreate()) return;
    this.form.reset({ firstName: '', lastName: '', profil: '', dateDisponibilite: null, experience: null, pru: null });
    this.linksFa.clear();
    this.editingId = null;
    this.selectedCvFile = null;
    this.cvError = null;
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
    this.selectedCvFile = null;
    this.cvError = null;
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
    const afterUpload = (id: number) => {
      if (this.selectedCvFile) {
        this.api.uploadCv(id, this.selectedCvFile).subscribe({
          next: () => { this.loadAll(); this.modalRef?.close(); },
          error: (err) => {
            console.error('[Candidats] uploadCv error', err);
            if (err?.status === 413) this.error = 'Fichier trop volumineux (max 10MB)';
            else if (err?.status === 415) this.error = 'Type de fichier non supporté (PDF/DOC/DOCX)';
            else this.error = err?.error?.message || 'Échec du téléversement du CV';
            this.loading = false;
          }
        });
      } else {
        this.loadAll();
        this.modalRef?.close();
      }
    };

    const obs = this.editingId != null ? this.api.update(this.editingId, payload) : this.api.create(payload);
    obs.subscribe({
      next: (res: any) => {
        const id = this.editingId ?? res?.id;
        if (id != null) afterUpload(id);
        else { this.loadAll(); this.modalRef?.close(); }
      },
      error: (err) => {
        console.error('[Candidats] submit error', err);
        this.error = err?.error?.message || 'Opération échouée';
        this.loading = false;
      }
    });
  }

  remove(c: Candidat): void {
    if (!this.canDelete() || !c.id) return;
    const ok = confirm(`Supprimer le candidat "${c.firstName} ${c.lastName}" ?`);
    if (!ok) return;
    this.loading = true;
    this.api.delete(c.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => {
        console.error('[Candidats] delete error', err);
        this.error = 'Suppression échouée';
        this.loading = false;
      }
    });
  }

  // List helpers
  get filtered(): Candidat[] {
    const q = (this.search || '').trim().toLowerCase();
    if (!q) return this.candidats;
    return this.candidats.filter(c =>
      (c.firstName || '').toLowerCase().includes(q) ||
      (c.lastName || '').toLowerCase().includes(q) ||
      (c.profil || '').toLowerCase().includes(q) ||
      ((c.experience != null ? String(c.experience) : '')).includes(q)
    );
  }

  get sorted(): Candidat[] {
    const arr = [...this.filtered];
    const k = this.sortKey;
    const d = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a: any, b: any) => {
      if (k === 'pru' || k === 'experience') {
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

  // Notes handling
  isNotesOpen(c: Candidat): boolean {
    const id = c.id ?? -1;
    return id !== -1 && this.openNotesId === id;
  }

  toggleNotes(c: Candidat): void {
    const id = c.id ?? -1;
    if (id === -1) return;
    const opening = this.openNotesId !== id;
    this.openNotesId = opening ? id : null;
    if (opening) {
      this.loadNotes(id);
    }
  }

  private loadNotes(id: number): void {
    if (!this.canView()) return;
    this.notesLoading[id] = true;
    this.notesError[id] = null;
    this.notesApi.list(id).subscribe({
      next: (rows) => {
        this.notesByCandidat[id] = rows || [];
        this.notesLoading[id] = false;
      },
      error: (err) => {
        console.error('[Candidats] loadNotes error', err);
        this.notesError[id] = err?.error?.message || 'Erreur lors du chargement des notes';
        this.notesLoading[id] = false;
      }
    });
  }

  addNote(c: Candidat): void {
    if (!this.canCreate()) return;
    const id = c.id ?? -1;
    if (id === -1) return;
    const content = (this.noteText[id] || '').trim();
    if (!content) { return; }
    const isPublic = !!this.notePublic[id];
    this.notesLoading[id] = true;
    this.notesApi.add(id, { content, isPublic }).subscribe({
      next: (note) => {
        if (!this.notesByCandidat[id]) this.notesByCandidat[id] = [];
        this.notesByCandidat[id] = [note, ...(this.notesByCandidat[id] || [])];
        this.noteText[id] = '';
        this.notePublic[id] = false;
        this.notesLoading[id] = false;
      },
      error: (err) => {
        console.error('[Candidats] addNote error', err);
        this.notesError[id] = err?.error?.message || 'Erreur lors de l\'ajout de la note';
        this.notesLoading[id] = false;
      }
    });
  }

  // Permissions
  canView(): boolean { return this.auth.hasAuthority('CANDIDAT_READ') || this.auth.hasAuthority('CAN_VIEW'); }
  canCreate(): boolean {
    return this.auth.hasAuthority('CANDIDAT_CREATE') || this.auth.hasAuthority('CANDIDAT_UPDATE') ||
           this.auth.hasAuthority('CAN_CREATE') || this.auth.hasAuthority('CAN_EDIT');
  }
  canEdit(): boolean { return this.auth.hasAuthority('CANDIDAT_UPDATE') || this.auth.hasAuthority('CAN_EDIT'); }
  canDelete(): boolean { return this.auth.hasAuthority('CANDIDAT_DELETE') || this.auth.hasAuthority('CAN_DELETE'); }

  // File handlers
  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.cvError = null;
    if (!file) { this.selectedCvFile = null; return; }
    // size check
    if (file.size > this.maxCvBytes) {
      this.selectedCvFile = null;
      this.cvError = 'Fichier trop volumineux (max 10MB)';
      input.value = '';
      return;
    }
    // extension check
    const name = file.name || '';
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (!this.allowedCvExt.has(ext)) {
      this.selectedCvFile = null;
      this.cvError = 'Type de fichier non supporté (PDF/DOC/DOCX)';
      input.value = '';
      return;
    }
    this.selectedCvFile = file;
  }

  downloadCv(c: Candidat): void {
    if (!c.id) return;
    this.api.downloadCv(c.id).subscribe({
      next: (res) => {
        const blob = res.body as Blob;
        const cd = res.headers.get('content-disposition') || '';
        let filename = this.suggestCvFilename(c, cd);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('[Candidats] downloadCv error', err);
        alert('CV introuvable ou accès refusé.');
      }
    });
  }

  private suggestCvFilename(c: Candidat, contentDisposition: string): string {
    const m = /filename\*=UTF-8''([^;\r\n]+)/i.exec(contentDisposition) || /filename="?([^";\r\n]+)"?/i.exec(contentDisposition);
    if (m && m[1]) {
      try { return decodeURIComponent(m[1]); } catch { return m[1]; }
    }
    const base = `${(c.lastName||'').trim()}_${(c.firstName||'').trim()}_CV`.replace(/\s+/g,'_');
    return base || 'cv.pdf';
  }
}
