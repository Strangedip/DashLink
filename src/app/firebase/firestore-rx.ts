import { Observable } from 'rxjs';
import { DocumentReference, Query, onSnapshot } from 'firebase/firestore';

export function collectionData<T = { id: string }>(queryRef: Query, options?: { idField?: string }): Observable<T[]> {
  const idField = options?.idField ?? 'id';
  return new Observable<T[]>(subscriber => {
    const unsubscribe = onSnapshot(
      queryRef,
      snapshot => {
        subscriber.next(
          snapshot.docs.map(docSnap => ({
            ...(docSnap.data() as object),
            [idField]: docSnap.id
          } as T))
        );
      },
      error => subscriber.error(error)
    );
    return unsubscribe;
  });
}

export function docData<T>(ref: DocumentReference, options?: { idField?: string }): Observable<T> {
  const idField = options?.idField ?? 'id';
  return new Observable<T>(subscriber => {
    const unsubscribe = onSnapshot(
      ref,
      snapshot => {
        if (!snapshot.exists()) {
          subscriber.next(undefined as T);
          return;
        }
        subscriber.next({
          ...(snapshot.data() as object),
          [idField]: snapshot.id
        } as T);
      },
      error => subscriber.error(error)
    );
    return unsubscribe;
  });
}
