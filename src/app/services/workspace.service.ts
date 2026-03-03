import { Injectable } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc,
  query, where, getDocs, setDoc, arrayUnion, arrayRemove, writeBatch,
  CollectionReference, Query, DocumentReference
} from '@angular/fire/firestore';
import { Observable, of, map, catchError, combineLatest, switchMap } from 'rxjs';
import {
  Workspace, WorkspaceNode, WorkspaceCollection, WorkspaceMember,
  WorkspaceInvite, WorkspaceFieldSchema, WorkspaceNodeField,
  generateInviteCode, areTypesCompatible
} from '../models/workspace.model';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  constructor(
    private firestore: Firestore,
    private logger: LoggerService
  ) {}

  // ─── Workspace CRUD ──────────────────────────────────────────

  getWorkspaces(userId: string): Observable<Workspace[]> {
    try {
      const workspacesRef = collection(this.firestore, 'workspaces') as CollectionReference<Workspace>;
      const q = query(workspacesRef, where('memberIds', 'array-contains', userId)) as Query<Workspace>;
      return (collectionData(q, { idField: 'id' }) as Observable<Workspace[]>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching workspaces:', error);
          return of([]);
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getWorkspaces:', error);
      return of([]);
    }
  }

  getWorkspace(workspaceId: string): Observable<Workspace> {
    try {
      const workspaceDocRef = doc(this.firestore, `workspaces/${workspaceId}`) as DocumentReference<Workspace>;
      return (docData(workspaceDocRef, { idField: 'id' }) as Observable<Workspace>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching workspace:', error);
          throw error;
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getWorkspace:', error);
      throw error;
    }
  }

  async createWorkspace(
    workspaceData: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt' | 'inviteCode'>
  ): Promise<string> {
    try {
      const inviteCode = generateInviteCode();
      const now = new Date();
      const workspacesRef = collection(this.firestore, 'workspaces');
      const docRef = await addDoc(workspacesRef, {
        ...workspaceData,
        inviteCode,
        createdAt: now,
        updatedAt: now
      });

      await this.createInvite(docRef.id, workspaceData.name, workspaceData.ownerName, inviteCode);

      return docRef.id;
    } catch (error: unknown) {
      this.logger.error('Error creating workspace:', error);
      throw error;
    }
  }

  async updateWorkspace(workspaceId: string, data: Partial<Workspace>): Promise<void> {
    try {
      const workspaceDocRef = doc(this.firestore, `workspaces/${workspaceId}`);
      await updateDoc(workspaceDocRef, { ...data, updatedAt: new Date() });
    } catch (error: unknown) {
      this.logger.error('Error updating workspace:', error);
      throw error;
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      const workspaceDocRef = doc(this.firestore, `workspaces/${workspaceId}`);
      await deleteDoc(workspaceDocRef);
    } catch (error: unknown) {
      this.logger.error('Error deleting workspace:', error);
      throw error;
    }
  }

  // ─── Invite System ───────────────────────────────────────────

  private async createInvite(
    workspaceId: string,
    workspaceName: string,
    ownerName: string,
    inviteCode: string
  ): Promise<void> {
    const inviteDocRef = doc(this.firestore, `workspace_invites/${inviteCode}`);
    await setDoc(inviteDocRef, {
      inviteCode,
      workspaceId,
      workspaceName,
      ownerName,
      active: true,
      createdAt: new Date()
    } as WorkspaceInvite);
  }

  getInvite(inviteCode: string): Observable<WorkspaceInvite | undefined> {
    try {
      const inviteDocRef = doc(this.firestore, `workspace_invites/${inviteCode}`) as DocumentReference<WorkspaceInvite>;
      return (docData(inviteDocRef) as Observable<WorkspaceInvite | undefined>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching invite:', error);
          return of(undefined);
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getInvite:', error);
      return of(undefined);
    }
  }

  async regenerateInviteCode(workspaceId: string, workspaceName: string, ownerName: string, oldInviteCode: string): Promise<string> {
    try {
      const oldInviteRef = doc(this.firestore, `workspace_invites/${oldInviteCode}`);
      await deleteDoc(oldInviteRef);

      const newCode = generateInviteCode();
      await this.createInvite(workspaceId, workspaceName, ownerName, newCode);
      await this.updateWorkspace(workspaceId, { inviteCode: newCode });
      return newCode;
    } catch (error: unknown) {
      this.logger.error('Error regenerating invite code:', error);
      throw error;
    }
  }

  async joinWorkspace(workspaceId: string, member: WorkspaceMember): Promise<void> {
    try {
      const workspaceDocRef = doc(this.firestore, `workspaces/${workspaceId}`);
      await updateDoc(workspaceDocRef, {
        memberIds: arrayUnion(member.userId),
        members: arrayUnion(member),
        updatedAt: new Date()
      });
    } catch (error: unknown) {
      this.logger.error('Error joining workspace:', error);
      throw error;
    }
  }

  // ─── Member Management ───────────────────────────────────────

  async removeMember(workspaceId: string, workspace: Workspace, userId: string): Promise<void> {
    try {
      const updatedMembers = workspace.members.filter(m => m.userId !== userId);
      const updatedMemberIds = workspace.memberIds.filter(id => id !== userId);
      await this.updateWorkspace(workspaceId, {
        members: updatedMembers,
        memberIds: updatedMemberIds
      });
    } catch (error: unknown) {
      this.logger.error('Error removing member:', error);
      throw error;
    }
  }

  async banMember(workspaceId: string, workspace: Workspace, userId: string): Promise<void> {
    try {
      const updatedMembers = workspace.members.map(m =>
        m.userId === userId ? { ...m, banned: true } : m
      );
      await this.updateWorkspace(workspaceId, { members: updatedMembers });
    } catch (error: unknown) {
      this.logger.error('Error banning member:', error);
      throw error;
    }
  }

  async unbanMember(workspaceId: string, workspace: Workspace, userId: string): Promise<void> {
    try {
      const updatedMembers = workspace.members.map(m =>
        m.userId === userId ? { ...m, banned: false } : m
      );
      await this.updateWorkspace(workspaceId, { members: updatedMembers });
    } catch (error: unknown) {
      this.logger.error('Error unbanning member:', error);
      throw error;
    }
  }

  // ─── Workspace Collections ───────────────────────────────────

  getWorkspaceCollections(workspaceId: string, parentCollectionId: string | null): Observable<WorkspaceCollection[]> {
    try {
      const collectionsRef = collection(this.firestore, `workspaces/${workspaceId}/collections`) as CollectionReference<WorkspaceCollection>;
      const q = query(collectionsRef, where('parentCollectionId', '==', parentCollectionId)) as Query<WorkspaceCollection>;
      return (collectionData(q, { idField: 'id' }) as Observable<WorkspaceCollection[]>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching workspace collections:', error);
          return of([]);
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getWorkspaceCollections:', error);
      return of([]);
    }
  }

  getWorkspaceCollection(workspaceId: string, collectionId: string): Observable<WorkspaceCollection> {
    try {
      const colDocRef = doc(this.firestore, `workspaces/${workspaceId}/collections/${collectionId}`) as DocumentReference<WorkspaceCollection>;
      return (docData(colDocRef, { idField: 'id' }) as Observable<WorkspaceCollection>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching workspace collection:', error);
          throw error;
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getWorkspaceCollection:', error);
      throw error;
    }
  }

  async addWorkspaceCollection(workspaceId: string, data: Omit<WorkspaceCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<unknown> {
    try {
      const collectionsRef = collection(this.firestore, `workspaces/${workspaceId}/collections`);
      const now = new Date();
      return await addDoc(collectionsRef, { ...data, createdAt: now, updatedAt: now });
    } catch (error: unknown) {
      this.logger.error('Error adding workspace collection:', error);
      throw error;
    }
  }

  async updateWorkspaceCollection(workspaceId: string, collectionId: string, data: Partial<WorkspaceCollection>): Promise<void> {
    try {
      const colDocRef = doc(this.firestore, `workspaces/${workspaceId}/collections/${collectionId}`);
      await updateDoc(colDocRef, { ...data, updatedAt: new Date() });
    } catch (error: unknown) {
      this.logger.error('Error updating workspace collection:', error);
      throw error;
    }
  }

  async deleteWorkspaceCollection(workspaceId: string, collectionId: string): Promise<void> {
    try {
      const colDocRef = doc(this.firestore, `workspaces/${workspaceId}/collections/${collectionId}`);
      await deleteDoc(colDocRef);
    } catch (error: unknown) {
      this.logger.error('Error deleting workspace collection:', error);
      throw error;
    }
  }

  // ─── Workspace Nodes ─────────────────────────────────────────

  getWorkspaceNodes(workspaceId: string, collectionId?: string | null): Observable<WorkspaceNode[]> {
    try {
      const path = collectionId
        ? `workspaces/${workspaceId}/collections/${collectionId}/nodes`
        : `workspaces/${workspaceId}/nodes`;
      const nodesRef = collection(this.firestore, path) as CollectionReference<WorkspaceNode>;
      return (collectionData(nodesRef, { idField: 'id' }) as Observable<WorkspaceNode[]>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching workspace nodes:', error);
          return of([]);
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getWorkspaceNodes:', error);
      return of([]);
    }
  }

  getAllWorkspaceNodes(workspaceId: string): Observable<WorkspaceNode[]> {
    try {
      const rootNodesRef = collection(this.firestore, `workspaces/${workspaceId}/nodes`) as CollectionReference<WorkspaceNode>;
      const rootNodes$ = collectionData(rootNodesRef, { idField: 'id' }) as Observable<WorkspaceNode[]>;

      const collectionsRef = collection(this.firestore, `workspaces/${workspaceId}/collections`);
      const collectionNodes$ = collectionData(collectionsRef, { idField: 'id' }).pipe(
        switchMap(collections => {
          if (collections.length === 0) return of([]);
          const nodeObservables = collections.map(col => {
            const nodesRef = collection(this.firestore, `workspaces/${workspaceId}/collections/${col.id}/nodes`) as CollectionReference<WorkspaceNode>;
            return collectionData(nodesRef, { idField: 'id' }) as Observable<WorkspaceNode[]>;
          });
          return combineLatest(nodeObservables).pipe(
            map(arrays => arrays.flat())
          );
        })
      );

      return combineLatest([rootNodes$, collectionNodes$]).pipe(
        map(([root, nested]) => [...root, ...nested]),
        catchError((error: unknown) => {
          this.logger.error('Error fetching all workspace nodes:', error);
          return of([]);
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getAllWorkspaceNodes:', error);
      return of([]);
    }
  }

  async addWorkspaceNode(
    workspaceId: string,
    collectionId: string | null,
    node: Omit<WorkspaceNode, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const path = collectionId
        ? `workspaces/${workspaceId}/collections/${collectionId}/nodes`
        : `workspaces/${workspaceId}/nodes`;
      const nodesRef = collection(this.firestore, path);
      const now = new Date();
      const docRef = await addDoc(nodesRef, { ...node, createdAt: now, updatedAt: now });
      return docRef.id;
    } catch (error: unknown) {
      this.logger.error('Error adding workspace node:', error);
      throw error;
    }
  }

  async updateWorkspaceNode(
    workspaceId: string,
    collectionId: string | null,
    nodeId: string,
    data: Partial<WorkspaceNode>
  ): Promise<void> {
    try {
      const path = collectionId
        ? `workspaces/${workspaceId}/collections/${collectionId}/nodes/${nodeId}`
        : `workspaces/${workspaceId}/nodes/${nodeId}`;
      const nodeDocRef = doc(this.firestore, path);
      await updateDoc(nodeDocRef, { ...data, updatedAt: new Date() });
    } catch (error: unknown) {
      this.logger.error('Error updating workspace node:', error);
      throw error;
    }
  }

  async deleteWorkspaceNode(workspaceId: string, collectionId: string | null, nodeId: string): Promise<void> {
    try {
      const path = collectionId
        ? `workspaces/${workspaceId}/collections/${collectionId}/nodes/${nodeId}`
        : `workspaces/${workspaceId}/nodes/${nodeId}`;
      const nodeDocRef = doc(this.firestore, path);
      await deleteDoc(nodeDocRef);
    } catch (error: unknown) {
      this.logger.error('Error deleting workspace node:', error);
      throw error;
    }
  }

  // ─── Schema Migration ────────────────────────────────────────

  async migrateWorkspaceNodes(
    workspaceId: string,
    oldSchema: WorkspaceFieldSchema[],
    newSchema: WorkspaceFieldSchema[]
  ): Promise<void> {
    try {
      const rootNodesRef = collection(this.firestore, `workspaces/${workspaceId}/nodes`);
      const rootSnapshot = await getDocs(rootNodesRef);

      const collectionsRef = collection(this.firestore, `workspaces/${workspaceId}/collections`);
      const colSnapshot = await getDocs(collectionsRef);

      const batch = writeBatch(this.firestore);
      let batchCount = 0;
      const MAX_BATCH = 450;

      const migrateNode = (nodeDoc: any) => {
        const nodeData = nodeDoc.data() as WorkspaceNode;
        const migratedFields = this.migrateFields(nodeData.fields || [], oldSchema, newSchema);
        batch.update(nodeDoc.ref, { fields: migratedFields as any, updatedAt: new Date() });
        batchCount++;
      };

      rootSnapshot.docs.forEach(migrateNode);

      for (const colDoc of colSnapshot.docs) {
        const colNodesRef = collection(this.firestore, `workspaces/${workspaceId}/collections/${colDoc.id}/nodes`);
        const colNodesSnapshot = await getDocs(colNodesRef);
        colNodesSnapshot.docs.forEach(migrateNode);
      }

      if (batchCount > 0 && batchCount <= MAX_BATCH) {
        await batch.commit();
      }
    } catch (error: unknown) {
      this.logger.error('Error migrating workspace nodes:', error);
      throw error;
    }
  }

  private migrateFields(
    existingFields: WorkspaceNodeField[],
    oldSchema: WorkspaceFieldSchema[],
    newSchema: WorkspaceFieldSchema[]
  ): WorkspaceNodeField[] {
    const newSchemaMap = new Map(newSchema.map(s => [s.fieldId, s]));
    const oldSchemaMap = new Map(oldSchema.map(s => [s.fieldId, s]));

    const migratedFields: WorkspaceNodeField[] = [];

    for (const newField of newSchema) {
      const existingField = existingFields.find(f => f.fieldId === newField.fieldId);
      const oldField = oldSchemaMap.get(newField.fieldId);

      if (existingField) {
        if (oldField && oldField.fieldType !== newField.fieldType) {
          if (areTypesCompatible(oldField.fieldType, newField.fieldType)) {
            migratedFields.push({
              ...existingField,
              fieldName: newField.fieldName,
              fieldType: newField.fieldType
            });
          } else {
            migratedFields.push({
              fieldId: newField.fieldId,
              fieldName: newField.fieldName,
              fieldType: newField.fieldType,
              value: null
            });
          }
        } else {
          migratedFields.push({
            ...existingField,
            fieldName: newField.fieldName,
            fieldType: newField.fieldType
          });
        }
      } else {
        migratedFields.push({
          fieldId: newField.fieldId,
          fieldName: newField.fieldName,
          fieldType: newField.fieldType,
          value: null
        });
      }
    }

    return migratedFields;
  }
}
