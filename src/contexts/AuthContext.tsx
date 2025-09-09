'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserRole } from '@/types';
import { handleGoogleRedirectResult } from '@/lib/firebase-utils';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isPaidUser: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle Google redirect result on page load
    const handleRedirect = async () => {
      try {
        await handleGoogleRedirectResult();
      } catch (error) {
        console.error('Error handling redirect result:', error);
      }
    };
    
    handleRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser({
              ...userData,
              uid: firebaseUser.uid,
              createdAt: userData.createdAt instanceof Date ? userData.createdAt : new Date(),
              updatedAt: userData.updatedAt instanceof Date ? userData.updatedAt : new Date(),
            });
          } else {
            // Create new user document for Google users or other auth providers
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: 'freeUser',
              createdAt: new Date(),
              updatedAt: new Date(),
              enrolledCourses: [],
              completedCourses: []
            };
            
            // Save to Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } catch (error) {
          console.error('Error fetching/creating user data:', error);
          // Set a basic user object if there's an error
          const fallbackUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'freeUser',
            createdAt: new Date(),
            updatedAt: new Date(),
            enrolledCourses: [],
            completedCourses: []
          };
          setUser(fallbackUser);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      // Redirect to home page after sign out
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshUserData = async () => {
    if (!firebaseUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUser({
          ...userData,
          uid: firebaseUser.uid,
          createdAt: userData.createdAt instanceof Date ? userData.createdAt : new Date(),
          updatedAt: userData.updatedAt instanceof Date ? userData.updatedAt : new Date(),
        });
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isPaidUser = user?.role === 'paidUser' || user?.role === 'admin';

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signOut: handleSignOut,
    isAdmin,
    isPaidUser,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
