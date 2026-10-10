import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MenuFavoritesService {
  private readonly storageKey = 'restaurant.menu-favorites.v1';
  private readonly keys = signal<string[]>(this.read());
  private key(item: any, category: string) { return JSON.stringify([category, item.name]); }
  private read(): string[] {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(stored) ? stored.filter(key => typeof key === 'string') : [];
    } catch { return []; }
  }
  has(item: any, category: string): boolean { return this.keys().includes(this.key(item, category)); }
  toggle(item: any, category: string) {
    const key = this.key(item, category);
    const next = this.has(item, category) ? this.keys().filter(value => value !== key) : [...this.keys(), key];
    this.keys.set(next);
    try { localStorage.setItem(this.storageKey, JSON.stringify(next)); } catch { /* Keep session favorites if storage is unavailable. */ }
  }
  resolve(categories: any[]): any[] {
    // Resolve against the current catalogue, so stored favorites never retain old prices.
    return categories.flatMap(category => category.items.filter((item: any) => this.has(item, category.name))
      .map((item: any) => ({ ...item, categoryName: category.name })));
  }
}
