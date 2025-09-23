import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';

import { TranslationService } from './translation.service';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private lastKey?: string;
  private lastParams?: Record<string, unknown>;
  private lastValue?: string;
  private readonly subscription: Subscription;

  constructor(private readonly translationService: TranslationService, private readonly cdr: ChangeDetectorRef) {
    this.subscription = this.translationService.languageChanges$.subscribe(() => {
      this.lastValue = undefined;
      this.cdr.markForCheck();
    });
  }

  transform(key: string, params?: Record<string, unknown>): string {
    if (!key) {
      return '';
    }

    if (this.lastKey === key && this.areParamsEqual(this.lastParams, params) && typeof this.lastValue === 'string') {
      return this.lastValue;
    }

    this.lastKey = key;
    this.lastParams = params;
    this.lastValue = this.translationService.translate(key, params);
    return this.lastValue;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private areParamsEqual(
    previous?: Record<string, unknown>,
    current?: Record<string, unknown>
  ): boolean {
    if (previous === current) {
      return true;
    }

    if (!previous || !current) {
      return !previous && !current;
    }

    const previousKeys = Object.keys(previous);
    const currentKeys = Object.keys(current);

    if (previousKeys.length !== currentKeys.length) {
      return false;
    }

    return previousKeys.every((key) => previous[key] === current[key]);
  }
}
