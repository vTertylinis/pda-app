import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuFavoritesService } from './menu-favorites.service';

describe('Device menu favorites', () => {
  const key = 'restaurant.menu-favorites.v1';
  const item = { name: 'Coffee', price: 3 };
  beforeEach(() => localStorage.removeItem(key));
  afterEach(() => { localStorage.removeItem(key); vi.restoreAllMocks(); TestBed.resetTestingModule(); });
  it('persists favorites by category and resolves current prices after a reload', () => {
    const favorites = TestBed.inject(MenuFavoritesService);
    favorites.toggle(item, 'Drinks');
    expect(favorites.has(item, 'Food')).toBe(false);
    TestBed.resetTestingModule();
    const restored = TestBed.inject(MenuFavoritesService);
    expect(restored.resolve([{ name: 'Drinks', items: [{ ...item, price: 4 }] }])).toEqual([{ ...item, price: 4, categoryName: 'Drinks' }]);
    restored.toggle(item, 'Drinks');
    expect(restored.resolve([{ name: 'Drinks', items: [item] }])).toEqual([]);
  });
  it('ignores corrupt storage and favorites absent from the current catalogue', () => {
    localStorage.setItem(key, '{broken');
    const favorites = TestBed.inject(MenuFavoritesService);
    expect(favorites.resolve([])).toEqual([]);
    favorites.toggle(item, 'Drinks');
    expect(favorites.resolve([{ name: 'Drinks', items: [] }])).toEqual([]);
  });
  it('keeps working in memory when persistent storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const favorites = TestBed.inject(MenuFavoritesService);
    favorites.toggle(item, 'Drinks');
    expect(favorites.has(item, 'Drinks')).toBe(true);
  });
});
