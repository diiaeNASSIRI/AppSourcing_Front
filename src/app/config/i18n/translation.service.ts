import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { LanguageCode, TRANSLATIONS, TranslationDictionary, TranslationValue } from './translations';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly storageKey = 'appsourcing.language';
  private currentLanguage: LanguageCode = 'fr';
  private readonly languageSubject = new BehaviorSubject<LanguageCode>(this.currentLanguage);

  constructor() {
    const persisted = this.loadPersistedLanguage();
    if (persisted && persisted !== this.currentLanguage) {
      this.currentLanguage = persisted;
      this.languageSubject.next(this.currentLanguage);
    }
  }

  get languageChanges$() {
    return this.languageSubject.asObservable();
  }

  get language(): LanguageCode {
    return this.currentLanguage;
  }

  setLanguage(language: LanguageCode): void {
    if (!TRANSLATIONS[language]) {
      return;
    }

    if (language !== this.currentLanguage) {
      this.currentLanguage = language;
      this.languageSubject.next(this.currentLanguage);
      this.persistLanguage(language);
    }
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translateKey(this.currentLanguage, key, params);
  }

  translate(key: string, params?: Record<string, unknown>): string {
    return this.instant(key, params);
  }

  private translateKey(language: LanguageCode, key: string, params?: Record<string, unknown>): string {
    const dictionary = TRANSLATIONS[language] as TranslationDictionary | undefined;
    const value: TranslationValue | undefined = dictionary?.[key];

    if (typeof value === 'function') {
      return value(params);
    }

    if (typeof value === 'string') {
      return this.interpolate(value, params);
    }

    const fallback = TRANSLATIONS.fr[key];
    if (typeof fallback === 'function') {
      return fallback(params);
    }

    if (typeof fallback === 'string') {
      return this.interpolate(fallback, params);
    }

    return key;
  }

  private interpolate(template: string, params?: Record<string, unknown>): string {
    if (!params) {
      return template;
    }

    return template.replace(/{{\s*(\w+)\s*}}/g, (_, token: string) => {
      const replacement = params[token];
      return typeof replacement === 'undefined' || replacement === null ? '' : String(replacement);
    });
  }

  private persistLanguage(language: LanguageCode): void {
    const storage = this.storage;
    if (!storage) {
      return;
    }

    storage.setItem(this.storageKey, language);
  }

  private loadPersistedLanguage(): LanguageCode | null {
    const storage = this.storage;
    if (!storage) {
      return null;
    }

    const stored = storage.getItem(this.storageKey);
    return stored === 'fr' || stored === 'en' ? (stored as LanguageCode) : null;
  }

  private get storage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      return null;
    }

    return null;
  }
}
