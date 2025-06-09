import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, getDocs, CollectionReference, Query, DocumentReference } from '@angular/fire/firestore';
import { Observable, tap, switchMap, combineLatest, of, map } from 'rxjs';
import { Collection, Node } from '../models/data.model';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  constructor(private firestore: Firestore) { }

  // --- Collection Operations ---

  getCollections(userId: string): Observable<Collection[]> {
    const collectionsRef = collection(this.firestore, `users/${userId}/collections`) as CollectionReference<Collection>;
    return collectionData(collectionsRef, { idField: 'id' }) as Observable<Collection[]>;
  }

  getCollection(userId: string, collectionId: string): Observable<Collection> {
    const collectionDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}`) as DocumentReference<Collection>;
    return docData(collectionDocRef, { idField: 'id' }) as Observable<Collection>;
  }

  addCollection(userId: string, newCollection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    const collectionsRef = collection(this.firestore, `users/${userId}/collections`);
    const now = new Date();
    return addDoc(collectionsRef, { ...newCollection, createdAt: now, updatedAt: now });
  }

  updateCollection(userId: string, collectionId: string, data: Partial<Collection>): Promise<void> {
    const collectionDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}`);
    return updateDoc(collectionDocRef, { ...data, updatedAt: new Date() });
  }

  deleteCollection(userId: string, collectionId: string): Promise<void> {
    const collectionDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}`);
    return deleteDoc(collectionDocRef);
  }

  // --- Node Operations ---

  getNodes(userId: string, collectionId: string): Observable<Node[]> {
    const nodesRef = collection(this.firestore, `users/${userId}/collections/${collectionId}/nodes`) as CollectionReference<Node>;
    return collectionData(nodesRef, { idField: 'id' }).pipe(
      tap(data => { })
    ) as Observable<Node[]>;
  }

  getAllNodes(userId: string): Observable<Node[]> {
    const collectionsRef = collection(this.firestore, `users/${userId}/collections`);
    const nodes: Node[] = [];
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
      })
    ) as Observable<Node[]>;
  }

  getNode(userId: string, collectionId: string, nodeId: string): Observable<Node> {
    const nodeDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/nodes/${nodeId}`) as DocumentReference<Node>;
    return docData(nodeDocRef, { idField: 'id' }) as Observable<Node>;
  }

  addNode(userId: string, collectionId: string, node: Omit<Node, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    const nodesRef = collection(this.firestore, `users/${userId}/collections/${collectionId}/nodes`);
    const now = new Date();
    return addDoc(nodesRef, { ...node, createdAt: now, updatedAt: now });
  }

  updateNode(userId: string, collectionId: string, nodeId: any, data: Partial<Node>): Promise<void> {
    const nodeDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/nodes/${nodeId}`);
    return updateDoc(nodeDocRef, { ...data, updatedAt: new Date() });
  }

  deleteNode(userId: string, collectionId: string, nodeId: string): Promise<void> {
    const nodeDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/nodes/${nodeId}`);
    return deleteDoc(nodeDocRef);
  }

  // Get sub-collections of a given parent collection
  getSubCollections(userId: string, parentCollectionId: string | null): Observable<Collection[]> {
    const collectionsRef = collection(this.firestore, `users/${userId}/collections`) as CollectionReference<Collection>;
    const q = query(collectionsRef, where('parentCollectionId', '==', parentCollectionId)) as Query<Collection>;
    return collectionData(q, { idField: 'id' }).pipe(
      tap(data => { })
    ) as Observable<Collection[]>;
  }

  async ensureDefaultUserCollection(userId: string): Promise<Collection> {
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
  }
} 