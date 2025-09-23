import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReferenceStyleService {
  colorClassFor(order?: number | null): string {
    const v = Number(order ?? 0);
    switch (v) {
      case 1: return 'badge bg-danger';
      case 2: return 'badge bg-primary';
      case 3: return 'badge bg-success';
      case 4: return 'badge bg-warning text-dark';
      case 5: return 'badge bg-secondary';
      default: return 'badge bg-light text-dark border';
    }
  }

  colorLabelFor(order?: number | null): string {
    const v = Number(order ?? 0);
    switch (v) {
      case 1: return 'Rouge';
      case 2: return 'Bleu';
      case 3: return 'Vert';
      case 4: return 'Orange';
      case 5: return 'Gris';
      default: return '—';
    }
  }
}
