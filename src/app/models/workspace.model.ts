export type WorkspaceFieldType =
  'text' | 'long-text' | 'number' | 'url' | 'email' | 'phone' |
  'date' | 'datetime' | 'image-url' |
  'checkbox' | 'dropdown' | 'color' | 'rating';

export interface WorkspaceFieldTypeOption {
  name: string;
  code: WorkspaceFieldType;
  icon: string;
}

export const WORKSPACE_FIELD_TYPES: WorkspaceFieldTypeOption[] = [
  { name: 'Text', code: 'text', icon: 'pi pi-align-left' },
  { name: 'Long Text', code: 'long-text', icon: 'pi pi-align-justify' },
  { name: 'Number', code: 'number', icon: 'pi pi-hashtag' },
  { name: 'URL', code: 'url', icon: 'pi pi-link' },
  { name: 'Email', code: 'email', icon: 'pi pi-envelope' },
  { name: 'Phone', code: 'phone', icon: 'pi pi-phone' },
  { name: 'Date', code: 'date', icon: 'pi pi-calendar' },
  { name: 'Date & Time', code: 'datetime', icon: 'pi pi-clock' },
  { name: 'Image URL', code: 'image-url', icon: 'pi pi-image' },
  { name: 'Checkbox', code: 'checkbox', icon: 'pi pi-check-square' },
  { name: 'Dropdown', code: 'dropdown', icon: 'pi pi-list' },
  { name: 'Color', code: 'color', icon: 'pi pi-palette' },
  { name: 'Rating', code: 'rating', icon: 'pi pi-star' },
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

export interface WorkspaceMetadata {
  goal?: string;
  rules?: string;
  duration?: string;
  penalty?: string;
  category?: string;
  tags?: string[];
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
  active: boolean;
  createdAt: Date;
}
