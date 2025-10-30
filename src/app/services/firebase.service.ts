import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, getDocs, CollectionReference, Query, DocumentReference } from '@angular/fire/firestore';
import { Observable, tap, switchMap, combineLatest, of, map, catchError } from 'rxjs';
import { Collection, Node } from '../models/data.model';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  constructor(
    private firestore: Firestore,
    private logger: LoggerService
  ) { }

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
      return collectionData(collectionsRef, { idField: 'id' }).pipe(
        switchMap(collections => {
          if (collections.length === 0) {
            return of([]);
          }
          const nodeObservables = collections.map(collectionItem => {
            const nodesRef = collection(this.firestore, `users/${userId}/collections/${collectionItem.id}/nodes`) as CollectionReference<Node>;
            return collectionData(nodesRef, { idField: 'id' });
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

  // Get sub-collections of a given parent collection
  getSubCollections(userId: string, parentCollectionId: string | null): Observable<Collection[]> {
    try {
      const collectionsRef = collection(this.firestore, `users/${userId}/collections`) as CollectionReference<Collection>;
      const q = query(collectionsRef, where('parentCollectionId', '==', parentCollectionId)) as Query<Collection>;
      return (collectionData(q, { idField: 'id' }) as Observable<Collection[]>).pipe(
        catchError((error: unknown) => {
          this.logger.error('Error fetching sub-collections:', error);
          return of([]);
        })
      );
    } catch (error: unknown) {
      this.logger.error('Error in getSubCollections:', error);
      return of([]);
    }
  }

  async ensureDefaultUserCollection(userId: string): Promise<Collection> {
    try {
      const collectionsRef = collection(this.firestore, `users/${userId}/collections`) as CollectionReference<Collection>;
      const q = query(collectionsRef, where('parentCollectionId', '==', null)) as Query<Collection>;
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const newCollection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
          name: 'My Collections',
          userId: userId,
          parentCollectionId: null,
        };
        const now = new Date();
        const docRef = await addDoc(collectionsRef, { ...newCollection, createdAt: now, updatedAt: now });
        return { id: docRef.id, ...newCollection, createdAt: now, updatedAt: now };
      } else {
        const firstDoc = querySnapshot.docs[0];
        return { id: firstDoc.id, ...firstDoc.data() as Omit<Collection, 'id'> };
      }
    } catch (error: unknown) {
      this.logger.error('Error ensuring default user collection:', error);
      throw error;
    }
  }
} 