import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, getDocs, CollectionReference, Query, DocumentReference } from '@angular/fire/firestore';
import { Observable, tap, switchMap, combineLatest, of, map } from 'rxjs';
import { Collection, Link } from '../models/data.model';

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

  // --- Link Operations ---

  getLinks(userId: string, collectionId: string): Observable<Link[]> {
    const linksRef = collection(this.firestore, `users/${userId}/collections/${collectionId}/links`) as CollectionReference<Link>;
    return collectionData(linksRef, { idField: 'id' }).pipe(
      tap(data => { })
    ) as Observable<Link[]>;
  }

  getAllLinks(userId: string): Observable<Link[]> {
    const collectionsRef = collection(this.firestore, `users/${userId}/collections`);
    const links: Link[] = [];
    return collectionData(collectionsRef, { idField: 'id' }).pipe(
      switchMap(collections => {
        if (collections.length === 0) {
          return of([]);
        }
        const linkObservables = collections.map(collectionItem => {
          const linksRef = collection(this.firestore, `users/${userId}/collections/${collectionItem.id}/links`) as CollectionReference<Link>;
          return collectionData(linksRef, { idField: 'id' });
        });
        return combineLatest(linkObservables).pipe(
          map(linkArrays => linkArrays.flat())
        );
      })
    ) as Observable<Link[]>;
  }

  getLink(userId: string, collectionId: string, linkId: string): Observable<Link> {
    const linkDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/links/${linkId}`) as DocumentReference<Link>;
    return docData(linkDocRef, { idField: 'id' }) as Observable<Link>;
  }

  addLink(userId: string, collectionId: string, link: Omit<Link, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    const linksRef = collection(this.firestore, `users/${userId}/collections/${collectionId}/links`);
    const now = new Date();
    return addDoc(linksRef, { ...link, createdAt: now, updatedAt: now });
  }

  updateLink(userId: string, collectionId: string, linkId: any, data: Partial<Link>): Promise<void> {
    const linkDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/links/${linkId}`);
    return updateDoc(linkDocRef, { ...data, updatedAt: new Date() });
  }

  deleteLink(userId: string, collectionId: string, linkId: string): Promise<void> {
    const linkDocRef = doc(this.firestore, `users/${userId}/collections/${collectionId}/links/${linkId}`);
    return deleteDoc(linkDocRef);
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