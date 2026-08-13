import { inject, Injectable } from '@angular/core';
import {
  Firestore, collection, doc, addDoc, updateDoc, deleteDoc, setDoc, getDocs,
  CollectionReference, DocumentReference
} from 'firebase/firestore';
import { Observable, switchMap, combineLatest, of, map, catchError } from 'rxjs';
import { Collection, Node } from '../models/data.model';
import { LoggerService } from './logger.service';
import { FIRESTORE } from '../firebase/firebase.providers';
import { collectionData, docData } from '../firebase/firestore-rx';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private firestore = inject(FIRESTORE);
  private logger = inject(LoggerService);

  // --- Collection Operations ---

  getCollections(userId: string): Observable<Collection[]> {
    try {
      const collectionsRef = collection(this.firestore, `users/${userId}/collections`) as CollectionReference<Collection>;
      return (collectionData(collectionsRef, { idField: 'id' }) as Observable<Collection[]>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching collections:', error);
          return of([]);
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getCollections:', error);
      return of([]);
    }
  }

  getCollection(userId: string, collectionId: string): Observable<Collection> {
    try {
      const collectionDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}`) as DocumentReference<Collection>;
      return (docData(collectionDocRef, { idField: 'id' }) as Observable<Collection>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching collection:', error);
          throw error;
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getCollection:', error);
      throw error;
    }
  }

  async addCollection(userId: string, newCollection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<unknown> {
    try {
      const collectionsRef = collection(this.firestore, `users/${userId}/collections`);
      const now = new Date();
      return await addDoc(collectionsRef, { ...newCollection, createdAt: now, updatedAt: now });
    } catch (error: unknown) {
      this.logger.error('Error adding collection:', error);
      throw error;
    }
  }

  async updateCollection(userId: string, collectionId: string, data: Partial<Collection>): Promise<void> {
    try {
      const collectionDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}`);
      await updateDoc(collectionDocRef, { ...data, updatedAt: new Date() });
    } catch (error: unknown) {
      this.logger.error('Error updating collection:', error);
      throw error;
    }
  }

  async deleteCollection(userId: string, collectionId: string): Promise<void> {
    try {
      const collectionDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}`);
      await deleteDoc(collectionDocRef);
    } catch (error: unknown) {
      this.logger.error('Error deleting collection:', error);
      throw error;
    }
  }

  // --- Node Operations ---

  getNodes(userId: string, collectionId: string): Observable<Node[]> {
    try {
      const nodesRef = collection(this.firestore, `users/${userId}/collections/${collectionId}/nodes`) as CollectionReference<Node>;
      return (collectionData(nodesRef, { idField: 'id' }) as Observable<Node[]>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching nodes:', error);
          return of([]);
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getNodes:', error);
      return of([]);
    }
  }

  getAllNodes(userId: string): Observable<Node[]> {
    try {
      const collectionsRef = collection(this.firestore, `users/${userId}/collections`);
      return collectionData<{ id: string }>(collectionsRef, { idField: 'id' }).pipe(
        switchMap(collections => {
          if (collections.length === 0) {
            return of([]);
          }
          const nodeObservables = collections.map(collectionItem => {
            const nodesRef = collection(this.firestore, `users/${userId}/collections/${collectionItem.id}/nodes`) as CollectionReference<Node>;
            return collectionData<Node>(nodesRef, { idField: 'id' });
          });
          return combineLatest(nodeObservables).pipe(
            map(nodeArrays => nodeArrays.flat())
          );
        }),
        catchError((error: unknown) => {
          this.logger.error('Error fetching all nodes:', error);
          return of([]);
        })
      ) as Observable<Node[]>;
    } catch (error: unknown) {
      this.logger.error('Error in getAllNodes:', error);
      return of([]);
    }
  }

  getNode(userId: string, collectionId: string, nodeId: string): Observable<Node> {
    try {
      const nodeDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/nodes/${nodeId}`) as DocumentReference<Node>;
      return (docData(nodeDocRef, { idField: 'id' }) as Observable<Node>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching node:', error);
          throw error;
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getNode:', error);
      throw error;
    }
  }

  async addNode(userId: string, collectionId: string, node: Omit<Node, 'id' | 'createdAt' | 'updatedAt'>): Promise<unknown> {
    try {
      const nodesRef = collection(this.firestore, `users/${userId}/collections/${collectionId}/nodes`);
      const now = new Date();
      return await addDoc(nodesRef, { ...node, createdAt: now, updatedAt: now });
    } catch (error: unknown) {
      this.logger.error('Error adding node:', error);
      throw error;
    }
  }

  async updateNode(userId: string, collectionId: string, nodeId: string, data: Partial<Node>): Promise<void> {
    try {
      const nodeDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/nodes/${nodeId}`);
      await updateDoc(nodeDocRef, { ...data, updatedAt: new Date() });
    } catch (error: unknown) {
      this.logger.error('Error updating node:', error);
      throw error;
    }
  }

  async deleteNode(userId: string, collectionId: string, nodeId: string): Promise<void> {
    try {
      const nodeDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/nodes/${nodeId}`);
      await deleteDoc(nodeDocRef);
    } catch (error: unknown) {
      this.logger.error('Error deleting node:', error);
      throw error;
    }
  }

  async restoreCollection(userId: string, collection: Collection): Promise<void> {
    if (!collection.id) {
      throw new Error('Collection id is required to restore.');
    }
    const { id, ...data } = collection;
    const collectionDocRef = doc(this.firestore, `users/${userId}/collections/${id}`);
    await setDoc(collectionDocRef, { ...data, updatedAt: new Date() });
  }

  async restoreNode(userId: string, collectionId: string, node: Node): Promise<void> {
    if (!node.id) {
      throw new Error('Node id is required to restore.');
    }
    const { id, ...data } = node;
    const nodeDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/nodes/${id}`);
    await setDoc(nodeDocRef, { ...data, updatedAt: new Date() });
  }

  // Get sub-collections of a given parent collection
  getSubCollections(userId: string, parentCollectionId: string | null): Observable<Collection[]> {
    return this.getCollections(userId).pipe(
      map(collections => collections.filter(item => this.sameParent(item.parentCollectionId, parentCollectionId)))
    );
  }

  async ensureDefaultUserCollection(userId: string): Promise<Collection> {
    try {
      const collectionsRef = collection(this.firestore, `users/${userId}/collections`) as CollectionReference<Collection>;
      const snapshot = await getDocs(collectionsRef);
      const existing = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Collection, 'id'>)
      }));

      const roots = existing.filter(item => this.sameParent(item.parentCollectionId, null));
      const namedRoot = roots.find(item => item.name === 'My Collections');
      if (namedRoot) {
        return namedRoot;
      }
      if (roots.length > 0) {
        return roots[0];
      }
      if (existing.length > 0) {
        return existing[0];
      }

      const newCollection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'My Collections',
        userId: userId,
        parentCollectionId: null,
      };
      const now = new Date();
      const docRef = await addDoc(collectionsRef, { ...newCollection, createdAt: now, updatedAt: now });
      return { id: docRef.id, ...newCollection, createdAt: now, updatedAt: now };
    } catch (error: unknown) {
      this.logger.error('Error ensuring default user collection:', error);
      throw error;
    }
  }

  private sameParent(value: string | null | undefined, expected: string | null): boolean {
    const normalized = value == null || value === '' ? null : value;
    return normalized === expected;
  }
} 