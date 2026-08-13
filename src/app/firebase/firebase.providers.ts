import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export const AUTH = new InjectionToken<Auth>('AUTH');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');

export function provideDashLinkFirebase(): EnvironmentProviders {
  const app = initializeApp(environment.firebaseConfig);
  return makeEnvironmentProviders([
    { provide: AUTH, useValue: getAuth(app) },
    { provide: FIRESTORE, useValue: getFirestore(app) }
  ]);
}
