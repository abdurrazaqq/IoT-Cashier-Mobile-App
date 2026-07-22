import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';
import { StorageService, StorageKeys } from './storage';

export class AuthService {

  // LOGIN
  static async login(email: string, password: string): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error('User tidak ditemukan di Firestore');
      }

      const data = userDoc.data();

      const userData: User = {
        id: firebaseUser.uid,
        email: data.email ?? email,
        name: data.name ?? '',
        role: data.role ?? 'cashier',
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date()
      };

      await StorageService.setItem(StorageKeys.USER_DATA, userData);
      await StorageService.setItem(StorageKeys.USER_ROLE, userData.role);

      return userData;

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // REGISTER
  static async register(
    email: string,
    password: string,
    name: string,
    role: 'admin' | 'cashier'
  ): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const userData = {
        id: firebaseUser.uid,
        email,
        name,
        role: role ?? 'cashier',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      await signOut(auth);

      return userData as User;

    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // LOGOUT
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
      await StorageService.clear();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // GET CURRENT USER (LOCAL CACHE)
  static async getCurrentUser(): Promise<User | null> {
    try {
      return await StorageService.getItem<User>(StorageKeys.USER_DATA);
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  // GET ROLE (LOCAL CACHE)
  static async getUserRole(): Promise<string | null> {
    try {
      return await StorageService.getItem<string>(StorageKeys.USER_ROLE);
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }

  // REFRESH USER FROM FIRESTORE (PENTING UNTUK EDIT ROLE MANUAL)
  static async refreshUser(): Promise<User | null> {
    try {
      const current = auth.currentUser;
      if (!current) return null;

      const snap = await getDoc(doc(db, 'users', current.uid));

      if (!snap.exists()) return null;

      const data = snap.data();

      const userData: User = {
        id: current.uid,
        email: data.email,
        name: data.name,
        role: data.role ?? 'cashier',
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date()
      };

      await StorageService.setItem(StorageKeys.USER_DATA, userData);
      await StorageService.setItem(StorageKeys.USER_ROLE, userData.role);

      return userData;

    } catch (error) {
      console.error('Refresh user error:', error);
      return null;
    }
  }
}