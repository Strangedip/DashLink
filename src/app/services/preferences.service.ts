import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ItemSort } from '../utils/item-sort';

export interface RecentItem {
  id: string;
  type: 'node' | 'collection' | 'workspace';
  name: string;
  path: string;
  collectionId?: string;
  workspaceId?: string;
  openedAt: number;
}

const MAX_RECENTS = 8;
const VISIBLE_RECENTS = 3;
const SORTS: ItemSort[] = ['type', 'alpha', 'date', 'recent'];

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private uid: string | null = null;
  readonly pins = signal<string[]>([]);
  readonly recents = signal<RecentItem[]>([]);
  readonly sort = signal<ItemSort>('type');
  readonly dashboardTab = signal<'personal' | 'workspaces'>('personal');
  readonly pins$ = new BehaviorSubject<string[]>([]);
  readonly recents$ = new BehaviorSubject<RecentItem[]>([]);
  readonly sort$ = new BehaviorSubject<ItemSort>('type');

  setUser(uid: string | null): void {
    this.uid = uid;
    this.pins.set(this.read<string[]>(this.pinKey(), []));
    this.recents.set(this.read<RecentItem[]>(this.recentKey(), []));
    const sort = this.read<ItemSort>(this.sortKey(), 'type');
    this.sort.set(SORTS.includes(sort) ? sort : 'type');
    const tab = this.read<'personal' | 'workspaces'>(this.tabKey(), 'personal');
    this.dashboardTab.set(tab === 'workspaces' ? 'workspaces' : 'personal');
    this.pins$.next(this.pins());
    this.recents$.next(this.recents());
    this.sort$.next(this.sort());
  }

  setDashboardTab(tab: 'personal' | 'workspaces'): void {
    this.dashboardTab.set(tab);
    this.write(this.tabKey(), tab);
  }

  isPinned(collectionId: string | undefined | null): boolean {
    return !!collectionId && this.pins().includes(collectionId);
  }

  togglePin(collectionId: string): void {
    const next = this.pins().includes(collectionId)
      ? this.pins().filter(id => id !== collectionId)
      : [collectionId, ...this.pins()];
    this.pins.set(next);
    this.pins$.next(next);
    this.write(this.pinKey(), next);
  }

  setSort(sort: ItemSort): void {
    this.sort.set(sort);
    this.sort$.next(sort);
    this.write(this.sortKey(), sort);
  }

  visibleRecents(): RecentItem[] {
    return this.recents().slice(0, VISIBLE_RECENTS);
  }

  addRecent(item: Omit<RecentItem, 'openedAt'>): void {
    if (!item.id) {
      return;
    }
    const entry: RecentItem = { ...item, openedAt: Date.now() };
    const next = [entry, ...this.recents().filter(existing => !(existing.id === entry.id && existing.type === entry.type))]
      .slice(0, MAX_RECENTS);
    this.recents.set(next);
    this.recents$.next(next);
    this.write(this.recentKey(), next);
  }

  remove(id: string): void {
    this.pins.set(this.pins().filter(pin => pin !== id));
    this.recents.set(this.recents().filter(item => item.id !== id));
    this.pins$.next(this.pins());
    this.recents$.next(this.recents());
    this.write(this.pinKey(), this.pins());
    this.write(this.recentKey(), this.recents());
  }

  private pinKey(): string {
    return `dl.pins.${this.uid || 'anon'}`;
  }

  private recentKey(): string {
    return `dl.recents.${this.uid || 'anon'}`;
  }

  private sortKey(): string {
    return `dl.sort.${this.uid || 'anon'}`;
  }

  private tabKey(): string {
    return `dl.dashboardTab.${this.uid || 'anon'}`;
  }

  private read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota / private-mode failures.
    }
  }
}
