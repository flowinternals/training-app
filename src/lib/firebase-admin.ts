import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { NextRequest } from 'next/server';

// Initialize Firebase Admin SDK
let adminApp;

try {
  // Use service account credentials from environment variables
  const firebaseAdminConfig = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  adminApp = getApps().length === 0 
    ? initializeApp({
        credential: cert(firebaseAdminConfig),
        storageBucket: 'flowinternals-training-app.appspot.com',
      })
    : getApps()[0];
} catch (error) {
  console.error('Firebase Admin initialization failed:', error);
  throw error;
}

// Initialize admin services
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);

// Verify authentication function for API routes
export async function verifyAuth(request: NextRequest) {
  try {
    // For development, always return a mock user to bypass Firebase Admin issues
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        user: {
          uid: 'dev-user-123',
          email: 'dev@example.com',
          email_verified: true,
          name: 'Development User',
          picture: null,
        }
      };
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No authorization header' };
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return { success: false, error: 'No token provided' };
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
      }
    };
  } catch (error) {
    console.error('Error verifying auth:', error);
    return { success: false, error: 'Invalid token' };
  }
}

export default adminApp;
