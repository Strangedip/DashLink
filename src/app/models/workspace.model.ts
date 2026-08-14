export type WorkspaceFieldType =
  'text' | 'long-text' | 'number' | 'url' | 'email' | 'phone' |
  'date' | 'datetime' | 'image-upload' |
  'checkbox' | 'dropdown' | 'color' | 'rating';

export interface WorkspaceFieldTypeOption {
  name: string;
  code: WorkspaceFieldType;
  icon: string;
}

export const WORKSPACE_FIELD_TYPES: WorkspaceFieldTypeOption[] = [
  { name: 'Text', code: 'text', icon: 'align-left' },
  { name: 'Long Text', code: 'long-text', icon: 'align-justify' },
  { name: 'Number', code: 'number', icon: 'hashtag' },
  { name: 'URL', code: 'url', icon: 'link' },
  { name: 'Email', code: 'email', icon: 'envelope' },
  { name: 'Phone', code: 'phone', icon: 'phone' },
  { name: 'Date', code: 'date', icon: 'calendar' },
  { name: 'Date & Time', code: 'datetime', icon: 'clock' },
  { name: 'Image Upload', code: 'image-upload', icon: 'upload' },
  { name: 'Checkbox', code: 'checkbox', icon: 'check-square' },
  { name: 'Dropdown', code: 'dropdown', icon: 'list' },
  { name: 'Color', code: 'color', icon: 'palette' },
  { name: 'Rating', code: 'rating', icon: 'star' },
];

export const COMPATIBLE_TYPE_GROUPS: WorkspaceFieldType[][] = [
  ['text', 'long-text', 'url', 'email', 'phone'],
  ['number', 'rating'],
  ['date', 'datetime'],
];

export function areTypesCompatible(oldType: WorkspaceFieldType, newType: WorkspaceFieldType): boolean {
  if (oldType === newType) return true;
  return COMPATIBLE_TYPE_GROUPS.some(group => group.includes(oldType) && group.includes(newType));
}

export function generateFieldId(): string {
  return `f_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface WorkspaceFieldSchema {
  fieldId: string;
  fieldName: string;
  fieldType: WorkspaceFieldType;
  mandatory: boolean;
  options?: string[];
  order: number;
}

export interface WorkspaceDetail {
  id: string;
  label: string;
  value: string;
}

export interface WorkspaceMetadata {
  purpose?: string;
  details?: WorkspaceDetail[];
  tags?: string[];
  /** Kept so older workspaces and invite previews still read correctly. */
  goal?: string;
  rules?: string;
  duration?: string;
  penalty?: string;
  category?: string;
}

export interface SchemaStarter {
  id: string;
  name: string;
  hint: string;
  fields: Array<Omit<WorkspaceFieldSchema, 'fieldId' | 'order'>>;
}

export const SCHEMA_STARTERS: SchemaStarter[] = [
  {
    id: 'attendance',
    name: 'Attendance',
    hint: 'Who showed up, and when',
    fields: [
      { fieldName: 'Date', fieldType: 'date', mandatory: true },
      { fieldName: 'Person', fieldType: 'text', mandatory: true },
      { fieldName: 'Status', fieldType: 'dropdown', mandatory: true, options: ['Present', 'Absent', 'Late'] },
      { fieldName: 'Notes', fieldType: 'long-text', mandatory: false },
    ]
  },
  {
    id: 'places',
    name: 'Places',
    hint: 'Spots, maps, and photos',
    fields: [
      { fieldName: 'Place', fieldType: 'text', mandatory: true },
      { fieldName: 'Link or map', fieldType: 'url', mandatory: false },
      { fieldName: 'Photo', fieldType: 'image-upload', mandatory: false },
      { fieldName: 'Notes', fieldType: 'long-text', mandatory: false },
    ]
  },
  {
    id: 'checkin',
    name: 'Check-in',
    hint: 'A dated update with an optional photo',
    fields: [
      { fieldName: 'Update', fieldType: 'long-text', mandatory: true },
      { fieldName: 'Date', fieldType: 'date', mandatory: true },
      { fieldName: 'Photo', fieldType: 'image-upload', mandatory: false },
    ]
  },
  {
    id: 'links',
    name: 'Shared links',
    hint: 'Bookmarks the group can add to',
    fields: [
      { fieldName: 'Title', fieldType: 'text', mandatory: true },
      { fieldName: 'URL', fieldType: 'url', mandatory: true },
      { fieldName: 'Notes', fieldType: 'long-text', mandatory: false },
    ]
  }
];

export function workspacePurpose(meta?: WorkspaceMetadata | null): string {
  if (!meta) {
    return '';
  }
  return (meta.purpose || meta.goal || '').trim();
}

export function workspaceDetails(meta?: WorkspaceMetadata | null): WorkspaceDetail[] {
  if (!meta) {
    return [];
  }
  if (meta.details?.length) {
    return meta.details.filter(item => item.label?.trim() && item.value?.trim());
  }
  const legacy: WorkspaceDetail[] = [];
  if (meta.goal) {
    legacy.push({ id: 'goal', label: 'Goal', value: meta.goal });
  }
  if (meta.rules) {
    legacy.push({ id: 'rules', label: 'Rules', value: meta.rules });
  }
  if (meta.duration) {
    legacy.push({ id: 'duration', label: 'Duration', value: meta.duration });
  }
  if (meta.penalty) {
    legacy.push({ id: 'penalty', label: 'Note', value: meta.penalty });
  }
  if (meta.category) {
    legacy.push({ id: 'category', label: 'Category', value: meta.category });
  }
  return legacy;
}

export function workspaceBadge(meta?: WorkspaceMetadata | null): string {
  if (!meta) {
    return '';
  }
  return (meta.category || meta.tags?.[0] || '').trim();
}

export interface WorkspaceMember {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'owner' | 'member';
  joinedAt: Date;
  banned: boolean;
}

export interface Workspace {
  id?: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
  memberLimit: number;
  memberIds: string[];
  members: WorkspaceMember[];
  schema: WorkspaceFieldSchema[];
  useCustomSchema: boolean;
  metadata: WorkspaceMetadata;
  aiApiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceNode {
  id?: string;
  workspaceId: string;
  collectionId?: string | null;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  creatorPhotoURL: string;
  name: string;
  description?: string | null;
  fields: WorkspaceNodeField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceNodeField {
  fieldId: string;
  fieldName: string;
  fieldType: WorkspaceFieldType;
  value: any;
}

export interface WorkspaceCollection {
  id?: string;
  name: string;
  description?: string;
  workspaceId: string;
  parentCollectionId?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceInvite {
  inviteCode: string;
  workspaceId: string;
  workspaceName: string;
  ownerName: string;
  description?: string;
  memberLimit?: number;
  memberCount?: number;
  goal?: string;
  purpose?: string;
  category?: string;
  active: boolean;
  createdAt: Date;
}
