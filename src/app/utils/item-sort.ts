export type ItemSort = 'type' | 'alpha' | 'date' | 'recent';

export const ITEM_SORT_OPTIONS: { value: ItemSort; label: string }[] = [
  { value: 'type', label: 'Type' },
  { value: 'alpha', label: 'A–Z' },
  { value: 'date', label: 'Newest' },
  { value: 'recent', label: 'Recently used' },
];

export function toMillis(value: unknown): number {
  if (!value) {
    return 0;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'object') {
    const maybe = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybe.toDate === 'function') {
      try {
        return maybe.toDate().getTime();
      } catch {
        return 0;
      }
    }
    if (typeof maybe.seconds === 'number') {
      return maybe.seconds * 1000;
    }
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function itemTime(item: { updatedAt?: unknown; createdAt?: unknown }): number {
  return toMillis(item.updatedAt) || toMillis(item.createdAt);
}

export function compareItems<T extends { id?: string; name?: string; type?: string; updatedAt?: unknown; createdAt?: unknown }>(
  a: T,
  b: T,
  sort: ItemSort,
  recents: { id: string }[],
  pinnedIds?: Set<string>
): number {
  if (pinnedIds?.size) {
    const aPinned = !!(a.id && pinnedIds.has(a.id));
    const bPinned = !!(b.id && pinnedIds.has(b.id));
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }
  }

  if (sort === 'alpha') {
    return (a.name || '').localeCompare(b.name || '');
  }

  if (sort === 'date') {
    return itemTime(b) - itemTime(a);
  }

  if (sort === 'recent') {
    const rank = (id?: string) => {
      if (!id) {
        return Number.MAX_SAFE_INTEGER;
      }
      const index = recents.findIndex(item => item.id === id);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    const delta = rank(a.id) - rank(b.id);
    if (delta !== 0) {
      return delta;
    }
    return (a.name || '').localeCompare(b.name || '');
  }

  if (a.type === 'collection' && b.type !== 'collection') {
    return -1;
  }
  if (a.type !== 'collection' && b.type === 'collection') {
    return 1;
  }
  return (a.name || '').localeCompare(b.name || '');
}
