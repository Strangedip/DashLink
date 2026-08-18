import { Injectable, inject } from '@angular/core';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { FIRESTORE } from '../firebase/firebase.providers';
import { CustomField, Node } from '../models/data.model';
import {
  PublicCollection,
  PublicField,
  PublicFieldType,
  PublicNode,
  PublicSharePayload,
  ShareTarget,
  publicFieldToCustomField
} from '../models/share.model';
import { WorkspaceNode } from '../models/workspace.model';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { LoggerService } from './logger.service';
import { ToastService } from './toast.service';

const FIELD_TYPES: PublicFieldType[] = [
  'text', 'long-text', 'url', 'email', 'phone', 'number', 'date', 'datetime', 'image', 'checkbox', 'color', 'rating'
];

@Injectable({ providedIn: 'root' })
export class ShareService {
  private firestore = inject(FIRESTORE);
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);
  private toast = inject(ToastService);
  private logger = inject(LoggerService);
  private readonly siteUrl = environment.production
    ? environment.siteUrl.replace(/\/$/, '')
    : 'https://dashlink-prj.web.app';

  primaryUrlFromNode(node: Node | null | undefined): string | null {
    if (!node) {
      return null;
    }
    if (Array.isArray(node.customFields)) {
      const urlField = node.customFields.find(field => field.fieldType === 'url' && field.fieldValue);
      if (urlField) {
        return this.toHref(String(urlField.fieldValue), true);
      }
    }
    return this.toHref(node.name, false);
  }

  primaryUrlFromWorkspaceNode(node: WorkspaceNode | null | undefined): string | null {
    if (!node) {
      return null;
    }
    const urlField = node.fields?.find(field => field.fieldType === 'url' && field.value);
    if (urlField) {
      return this.toHref(String(urlField.value), true);
    }
    return this.toHref(node.name, false);
  }

  async getPublicShare(shareId: string): Promise<PublicSharePayload> {
    const snap = await getDoc(doc(this.firestore, 'shares', shareId));
    if (!snap.exists()) {
      return this.unavailable(shareId);
    }
    const data = snap.data() || {};
    const ownerId = String(data['ownerId'] || '');
    const uid = this.auth.currentUserUid;
    const viewer = uid && uid === ownerId ? 'owner' : (uid ? 'signed-in' : 'guest');
    const node = (data['node'] as PublicNode) || null;
    const collectionTree = (data['collection'] as PublicCollection) || null;
    if (!node && !collectionTree) {
      return this.unavailable(shareId, String(data['ownerName'] || ''));
    }
    return {
      shareId,
      kind: data['kind'] === 'collection' ? 'collection' : 'node',
      origin: data['origin'] === 'workspace' ? 'workspace' : 'personal',
      ownerName: String(data['ownerName'] || 'A DashLink user'),
      title: String(data['title'] || node?.name || collectionTree?.name || 'DashLink'),
      description: String(data['description'] || ''),
      coverImage: (data['coverImage'] as string) || node?.coverImage || null,
      viewer,
      openPath: viewer === 'owner' ? this.openPathFor(data) : null,
      node,
      collection: collectionTree,
      unavailable: false
    };
  }

  async shareDashLink(target: ShareTarget): Promise<void> {
    try {
      const url = await this.ensureShareUrl(target);
      const result = await this.share({
        title: target.title,
        text: target.text || 'Shared on DashLink',
        url
      });
      if (result === 'copied') {
        this.toast.showSuccess(
          'Link copied',
          target.kind === 'collection'
            ? 'Anyone with this link can view the folder.'
            : 'Anyone with this link can view it.'
        );
      } else if (result === 'failed') {
        this.toast.showError('Could not copy link', 'Try copying it from the address bar after opening it.');
      }
    } catch (error: unknown) {
      this.logger.error('Share failed:', error);
      this.toast.showError('Could not share', this.shareErrorMessage(error));
    }
  }

  async cloneIntoMyStuff(payload: PublicSharePayload, destinationCollectionId: string): Promise<{ collectionId: string; nodeId?: string }> {
    const uid = this.auth.currentUserUid;
    if (!uid) {
      throw new Error('Sign in to save this.');
    }
    if (payload.unavailable || (!payload.node && !payload.collection)) {
      throw new Error('This DashLink is unavailable.');
    }
    if (payload.node) {
      const nodeId = await this.cloneNode(uid, destinationCollectionId, payload.node);
      return { collectionId: destinationCollectionId, nodeId };
    }
    const collectionId = await this.cloneCollection(uid, destinationCollectionId, payload.collection!);
    return { collectionId };
  }

  open(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const input = document.createElement('textarea');
        input.value = text;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(input);
        return ok;
      } catch {
        return false;
      }
    }
  }

  async share(payload: { title: string; text?: string; url?: string }): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
    const shareUrl = payload.url || '';
    const shareText = payload.text || payload.title;
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: shareText,
          url: shareUrl || undefined
        });
        return 'shared';
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }
    const copied = await this.copy(shareUrl || [payload.title, shareText].filter(Boolean).join('\n'));
    return copied ? 'copied' : 'failed';
  }

  hrefFromValue(value: unknown): string | null {
    return this.toHref(value == null ? '' : String(value), true);
  }

  private async ensureShareUrl(target: ShareTarget): Promise<string> {
    const uid = this.auth.currentUserUid;
    if (!uid) {
      throw new Error('Sign in to share.');
    }
    const collectionId = target.collectionId || null;
    const nodeId = target.kind === 'node' ? (target.nodeId || null) : null;
    const workspaceId = target.origin === 'workspace' ? (target.workspaceId || null) : null;
    if (target.kind === 'node' && !nodeId) {
      throw new Error('This item is missing an id.');
    }
    if (target.kind === 'collection' && !collectionId) {
      throw new Error('This folder is missing an id.');
    }
    if (target.origin === 'workspace' && !workspaceId) {
      throw new Error('This workspace item is missing a workspace id.');
    }
    const snapshot = target.kind === 'node'
      ? { node: await this.loadPublicNode(target, uid), collection: null as PublicCollection | null }
      : { node: null as PublicNode | null, collection: await this.loadPublicCollection(target, uid) };
    const coverImage = snapshot.node?.coverImage || this.collectionCover(snapshot.collection);
    const description = snapshot.node
      ? this.stripHtml(snapshot.node.description) || snapshot.node.name
      : this.stripHtml(snapshot.collection?.description) || target.title;
    const shareId = await this.idFor(target, uid);
    const user = this.auth.currentUser || await firstValueFrom(this.auth.user$);
    await setDoc(doc(this.firestore, 'shares', shareId), {
      kind: target.kind,
      origin: target.origin,
      ownerId: uid,
      ownerName: (user?.displayName || user?.email || 'A DashLink user').trim(),
      workspaceId,
      collectionId,
      nodeId,
      title: target.title || snapshot.node?.name || snapshot.collection?.name || 'DashLink',
      description: description.slice(0, 220),
      coverImage,
      node: snapshot.node,
      collection: snapshot.collection,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return `${this.siteUrl}/s/${shareId}`;
  }

  private async loadPublicNode(target: ShareTarget, uid: string): Promise<PublicNode> {
    if (target.origin === 'workspace' && target.workspaceId && target.nodeId) {
      const nested = target.collectionId
        ? doc(this.firestore, `workspaces/${target.workspaceId}/collections/${target.collectionId}/nodes/${target.nodeId}`)
        : doc(this.firestore, `workspaces/${target.workspaceId}/nodes/${target.nodeId}`);
      let snap = await getDoc(nested);
      if (!snap.exists() && target.collectionId) {
        snap = await getDoc(doc(this.firestore, `workspaces/${target.workspaceId}/nodes/${target.nodeId}`));
      }
      if (!snap.exists()) {
        throw new Error('This item could not be shared.');
      }
      return this.publicNodeFromWorkspace({ id: snap.id, ...(snap.data() as WorkspaceNode) });
    }
    const snap = await getDoc(doc(
      this.firestore,
      `users/${uid}/collections/${target.collectionId}/nodes/${target.nodeId}`
    ));
    if (!snap.exists()) {
      throw new Error('This item could not be shared.');
    }
    return this.publicNodeFromPersonal({ id: snap.id, ...(snap.data() as Node) });
  }

  private async loadPublicCollection(target: ShareTarget, uid: string): Promise<PublicCollection> {
    const rootId = target.collectionId!;
    if (target.origin === 'workspace' && target.workspaceId) {
      const rootSnap = await getDoc(doc(this.firestore, `workspaces/${target.workspaceId}/collections/${rootId}`));
      if (!rootSnap.exists()) {
        throw new Error('This folder could not be shared.');
      }
      const all = await getDocs(collection(this.firestore, `workspaces/${target.workspaceId}/collections`));
      const collections = all.docs.map(item => ({ id: item.id, ...item.data() as { name?: string; description?: string; parentCollectionId?: string | null } }));
      const ids = this.descendantIds(rootId, collections);
      const nodesByCollection = new Map<string, PublicNode[]>();
      for (const id of ids) {
        const nodeSnap = await getDocs(collection(this.firestore, `workspaces/${target.workspaceId}/collections/${id}/nodes`));
        nodesByCollection.set(id, nodeSnap.docs.map(item => this.publicNodeFromWorkspace({ id: item.id, ...(item.data() as WorkspaceNode) })));
      }
      return this.buildTree({ id: rootSnap.id, ...rootSnap.data() as { name?: string; description?: string } }, collections, nodesByCollection);
    }
    const rootSnap = await getDoc(doc(this.firestore, `users/${uid}/collections/${rootId}`));
    if (!rootSnap.exists()) {
      throw new Error('This folder could not be shared.');
    }
    const all = await getDocs(collection(this.firestore, `users/${uid}/collections`));
    const collections = all.docs.map(item => ({ id: item.id, ...item.data() as { name?: string; description?: string; parentCollectionId?: string | null } }));
    const ids = this.descendantIds(rootId, collections);
    const nodesByCollection = new Map<string, PublicNode[]>();
    for (const id of ids) {
      const nodeSnap = await getDocs(collection(this.firestore, `users/${uid}/collections/${id}/nodes`));
      nodesByCollection.set(id, nodeSnap.docs.map(item => this.publicNodeFromPersonal({ id: item.id, ...(item.data() as Node) })));
    }
    return this.buildTree({ id: rootSnap.id, ...rootSnap.data() as { name?: string; description?: string } }, collections, nodesByCollection);
  }

  private descendantIds(
    rootId: string,
    collections: { id: string; parentCollectionId?: string | null }[]
  ): string[] {
    const ids = new Set<string>([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const item of collections) {
        const parent = item.parentCollectionId == null || item.parentCollectionId === '' ? null : item.parentCollectionId;
        if (parent && ids.has(parent) && !ids.has(item.id)) {
          ids.add(item.id);
          added = true;
        }
      }
    }
    return [...ids].slice(0, 80);
  }

  private buildTree(
    root: { id: string; name?: string; description?: string },
    collections: { id: string; name?: string; description?: string; parentCollectionId?: string | null }[],
    nodesByCollection: Map<string, PublicNode[]>
  ): PublicCollection {
    const byParent = new Map<string | null, typeof collections>();
    for (const item of collections) {
      const parent = item.parentCollectionId == null || item.parentCollectionId === '' ? null : item.parentCollectionId;
      if (!byParent.has(parent)) {
        byParent.set(parent, []);
      }
      byParent.get(parent)!.push(item);
    }
    const walk = (id: string): PublicCollection[] =>
      (byParent.get(id) || []).map(child => ({
        name: (child.name || 'Untitled').trim(),
        description: String(child.description || ''),
        nodes: nodesByCollection.get(child.id) || [],
        collections: walk(child.id)
      }));
    return {
      name: (root.name || 'Untitled').trim(),
      description: String(root.description || ''),
      nodes: nodesByCollection.get(root.id) || [],
      collections: walk(root.id)
    };
  }

  private publicNodeFromPersonal(node: Node): PublicNode {
    const fields = this.mapFields(node.customFields || []);
    return {
      name: (node.name || 'Untitled').trim(),
      description: String(node.description || ''),
      fields,
      primaryUrl: this.firstUrl(fields) || this.toHref(node.name, false),
      coverImage: this.firstCover(fields)
    };
  }

  private publicNodeFromWorkspace(node: WorkspaceNode): PublicNode {
    const fields = this.mapFields((node.fields || []).map(field => ({
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      fieldValue: field.value
    })));
    return {
      name: (node.name || 'Untitled').trim(),
      description: String(node.description || ''),
      fields,
      primaryUrl: this.firstUrl(fields) || this.toHref(node.name, false),
      coverImage: this.firstCover(fields)
    };
  }

  private mapFields(raw: { fieldName?: string; name?: string; fieldType?: string; type?: string; fieldValue?: unknown; value?: unknown }[]): PublicField[] {
    const fields: PublicField[] = [];
    for (const field of raw) {
      const name = String(field.fieldName || field.name || '').trim();
      const type = this.publicType(String(field.fieldType || field.type || ''));
      const value = this.jsonSafe(field.fieldValue !== undefined ? field.fieldValue : field.value);
      if (!name || value == null || value === '') {
        continue;
      }
      fields.push({ name, type, value });
    }
    return fields;
  }

  private publicType(raw: string): PublicFieldType {
    if (raw === 'imageUrl' || raw === 'image-upload') {
      return 'image';
    }
    if (raw === 'richText' || raw === 'long-text') {
      return 'long-text';
    }
    return FIELD_TYPES.includes(raw as PublicFieldType) ? raw as PublicFieldType : 'text';
  }

  private firstCover(fields: PublicField[]): string | null {
    const image = fields.find(field => field.type === 'image' && /^https?:\/\//i.test(String(field.value || '')));
    return image ? String(image.value).trim() : null;
  }

  private firstUrl(fields: PublicField[]): string | null {
    const urlField = fields.find(field => field.type === 'url');
    return urlField ? this.toHref(String(urlField.value), true) : null;
  }

  private collectionCover(tree: PublicCollection | null): string | null {
    if (!tree) {
      return null;
    }
    for (const node of tree.nodes || []) {
      if (node.coverImage) {
        return node.coverImage;
      }
    }
    for (const child of tree.collections || []) {
      const nested = this.collectionCover(child);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  private jsonSafe(value: unknown): unknown {
    if (value == null) {
      return null;
    }
    if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  private stripHtml(value: string | null | undefined): string {
    return String(value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private openPathFor(data: Record<string, unknown>): string {
    const origin = data['origin'];
    const workspaceId = data['workspaceId'];
    const collectionId = data['collectionId'];
    if (origin === 'workspace' && workspaceId) {
      return collectionId
        ? `/workspaces/${workspaceId}/collections/${collectionId}`
        : `/workspaces/${workspaceId}`;
    }
    if (collectionId) {
      return `/collections/${collectionId}`;
    }
    return '/dashboard';
  }

  private unavailable(shareId: string, ownerName = ''): PublicSharePayload {
    return {
      shareId,
      kind: 'node',
      origin: 'personal',
      ownerName,
      title: 'This DashLink is unavailable',
      description: 'The original item may have been deleted.',
      coverImage: null,
      viewer: this.auth.currentUserUid ? 'signed-in' : 'guest',
      openPath: null,
      node: null,
      collection: null,
      unavailable: true
    };
  }

  private async cloneCollection(userId: string, parentCollectionId: string, tree: PublicCollection): Promise<string> {
    const created = await this.firebase.addCollection(userId, {
      name: tree.name || 'Untitled',
      description: tree.description || undefined,
      parentCollectionId,
      userId
    }) as { id: string };
    const collectionId = created.id;
    for (const node of tree.nodes || []) {
      await this.cloneNode(userId, collectionId, node);
    }
    for (const child of tree.collections || []) {
      await this.cloneCollection(userId, collectionId, child);
    }
    return collectionId;
  }

  private async cloneNode(userId: string, collectionId: string, node: PublicNode): Promise<string | undefined> {
    const customFields: CustomField[] = (node.fields || []).map(publicFieldToCustomField);
    const created = await this.firebase.addNode(userId, collectionId, {
      name: node.name || 'Untitled',
      description: node.description || null,
      collectionId,
      userId,
      customFields
    }) as { id?: string };
    return created.id;
  }

  private async idFor(target: ShareTarget, uid: string): Promise<string> {
    const key = [
      'v1',
      target.origin,
      uid,
      target.kind,
      target.workspaceId || '',
      target.collectionId || '',
      target.kind === 'node' ? (target.nodeId || '') : ''
    ].join(':');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const bytes = new Uint8Array(digest).subarray(0, 16);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private shareErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message && !error.message.startsWith('Firebase')) {
      if (/sign in/i.test(error.message) || /missing|could not/i.test(error.message)) {
        return error.message;
      }
    }
    const code = typeof error === 'object' && error && 'code' in error
      ? String((error as { code: string }).code)
      : '';
    if (code.includes('permission-denied')) {
      return 'You do not have permission to share this.';
    }
    return 'Try again in a moment.';
  }

  private toHref(value: string | null | undefined, allowBare: boolean): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (/^www\./i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    if (allowBare && /^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return null;
  }
}
