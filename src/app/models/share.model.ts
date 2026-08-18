export type ShareKind = 'node' | 'collection';
export type ShareOrigin = 'personal' | 'workspace';
export type ShareViewer = 'owner' | 'signed-in' | 'guest';

export type PublicFieldType =
  | 'text'
  | 'long-text'
  | 'url'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'datetime'
  | 'image'
  | 'checkbox'
  | 'color'
  | 'rating';

export interface PublicField {
  name: string;
  type: PublicFieldType;
  value: unknown;
}

export interface PublicNode {
  name: string;
  description: string;
  fields: PublicField[];
  primaryUrl: string | null;
  coverImage: string | null;
}

export interface PublicCollection {
  name: string;
  description: string;
  nodes: PublicNode[];
  collections: PublicCollection[];
}

export interface ShareTarget {
  kind: ShareKind;
  origin: ShareOrigin;
  title: string;
  text?: string;
  collectionId?: string | null;
  nodeId?: string | null;
  workspaceId?: string | null;
}

export interface PublicSharePayload {
  shareId: string;
  kind: ShareKind;
  origin: ShareOrigin;
  ownerName: string;
  title: string;
  description: string;
  coverImage: string | null;
  viewer: ShareViewer;
  openPath: string | null;
  node: PublicNode | null;
  collection: PublicCollection | null;
  unavailable?: boolean;
}

export function publicFieldToCustomField(field: PublicField): { fieldName: string; fieldType: string; fieldValue: unknown } {
  switch (field.type) {
    case 'image':
      return { fieldName: field.name, fieldType: 'imageUrl', fieldValue: stringifyValue(field.value) };
    case 'url':
      return { fieldName: field.name, fieldType: 'url', fieldValue: stringifyValue(field.value) };
    case 'number':
    case 'rating':
      return { fieldName: field.name, fieldType: 'number', fieldValue: toNumber(field.value) };
    case 'date':
    case 'datetime':
      return { fieldName: field.name, fieldType: 'date', fieldValue: stringifyValue(field.value) };
    default:
      return { fieldName: field.name, fieldType: 'text', fieldValue: stringifyValue(field.value) };
  }
}

function stringifyValue(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function toNumber(value: unknown): number | string {
  const n = Number(value);
  return Number.isFinite(n) ? n : stringifyValue(value);
}
