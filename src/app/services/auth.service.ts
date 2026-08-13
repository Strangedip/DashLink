import { inject, Injectable } from '@angular/core';
import {
  Auth,
  User,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { Observable } from 'rxjs';
import { AUTH } from '../firebase/firebase.providers';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(AUTH);
  user$: Observable<User | null> = new Observable(subscriber =>
    onAuthStateChanged(
      this.auth,
      user => subscriber.next(user),
      error => subscriber.error(error)
    )
  );

  async register(email: string, password: string): Promise<unknown> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  async login(email: string, password: string): Promise<unknown> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout(): Promise<void> {
    return signOut(this.auth);
  }

  async signInWithGoogle(): Promise<unknown> {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  get currentUserUid(): string | null {
    return this.auth.currentUser ? this.auth.currentUser.uid : null;
  }

  async sendPasswordReset(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async updateDisplayName(name: string): Promise<void> {
    if (!this.auth.currentUser) {
      throw new Error('Not signed in');
    }
    await updateProfile(this.auth.currentUser, { displayName: name.trim() });
    await this.auth.currentUser.reload();
  }

  consumePostAuthUrl(fallback = '/dashboard'): string {
    try {
      const stored = sessionStorage.getItem('dl.postAuth');
      sessionStorage.removeItem('dl.postAuth');
      if (stored && stored.startsWith('/') && !stored.startsWith('/auth')) {
        return stored;
      }
    } catch {
      // Ignore storage access errors.
    }
    return fallback.startsWith('/') && !fallback.startsWith('/auth') ? fallback : '/dashboard';
  }
}
