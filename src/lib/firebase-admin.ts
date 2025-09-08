import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { NextRequest } from 'next/server';

// Initialize Firebase Admin SDK
let adminApp;

try {
  // Use service account credentials
  const firebaseAdminConfig = {
    projectId: 'flowinternals-training-app',
    clientEmail: 'firebase-adminsdk-fbsvc@flowinternals-training-app.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDEBVsdcQSFmpzj\nhskrVgrwnn0lb7a5JJ9/flTGnmLba8G8WWiuJRU+GdVr+FLWqKVtXY9GfPtyk0JE\nlvjtdYZmeMBU1sSOfnvs5ou/RqpnUhb1XDOdGW20p/O9EirhRSCUCY8lTETQP0aU\nHHdLNSV0woKYx+SSGbOdYAXlNHhliw5QPi4jsyFpuY8HBNsemXjoiXJ1IHnP9yKp\nGVED2A336AtPPtLOy3H6kQOYZ5OD8TfaOasmN0eJAHjdLG9dLbQTFoaJg2+slX5S\nrkLxPrnsmOQTLuEsFM8nEVO5EwpkTQ9lHkLiCJ/eXCQ2pAp0KJEJXypriikWAtB/\nGTXepg+xAgMBAAECggEAPIV00N3EqiWHHB7Q/M7XmNwuQoE/9uDuV/Re42YimqGm\nEuu+DMqJSP+769ajaQBv9xjkdDyBfCooUzoTyGk5YmkU5PzceixmQcoayqdcVIM9\ncGsTyoT/4L/cWvuBfsUTnnFnH3pxYqSuu2sgj/lsQ6UMonRRR6Sk1sm/eDmflKX0\nOqdz1iUiqiAPwoUvYYKLPOVvmvXG7/k4pHD1ygACdFLa0AwAKwV+AT1btaAAXmd4\nNIkc5meJ7wEpTkCNwYNYSbyY6dplkeabnds9eQPZ4F8ff6pPPboW3WhKuRXSc8n1\n6Ii3My4i9E1jFgs9lCLrKfc+UcZ65AlN+++JhoFo+wKBgQDyBqNqfGF6FGSrGD4W\nKDZb+yQcpUnvTnujqswkgDQacKxSkuVJYQjRHB9tBO+0fek3X8lWHQtCspeUxHc7\nyTs8BJCGcAr7HpRQLBjslY4zfJapWt/AkH+orZFvdKP1auqcIAwYEjlXJZmeWf5I\n9xT0Gccyakv+2x3QGnR0RuSnBwKBgQDPVrjWXtgjCbdSXJfyZGAUbRl4Ma5fkbgD\niVKrCaL/JQO5QXXRIBvSf5ougpG80iyVL5GOZfKE50Xv1p4JQ3s3id9LPQLtvb5P\nSS5eHeHRQBPxfq1IPrPeCz0Gp/UmrcKoRiUQ27KwisEM5nelMdfzSPJ4A5x5gu/b\nPQ5nhmxthwKBgGr5YiuD9HXII8K4AWE7vuMi+xAqQqaicuWhbX/Ipr71BEWvJecs\nG4CJxJ4kK2sEqBtQnCYSylJdq8AWonjrdeIORm8VgNUD7BwPkaioZeT98X3Da9iq\nRbKhnQG9dWbZLf957r6I9408Ukz6i/lmNH28Ex6GezaXVPMRbl2ipBfrAoGAdGhx\nMFJhsRJUbZZ07O80DmPOh/AEwb1zffDMjCDF9dAXThyVhEsts7pWm0RNhKDPzRa+\n9x7/0WRznJt3cSYE+QKcboabrVT5k1Q4BzlpvmzmhZCkw0oI/GJ86c7E0el+v7Fa\nQCPJKFtO1epTRFk+sGXFVGJaqNI9zm5yNud+2uMCgYAx69jQm1muQXLPMITMgBrt\nwtZxaYgdtbCtSvuHKmCKYKHW7p/Xmf6ohdl4neeUnImGw1llHI0bYjCGocj5Y//V\nUG8HTy6ApFsgu9w+wy4UfuOWo9EaR7qM9fHNTO5JmUZQnPWmsDRcu6M/9E3+wx4n\ndtPeKqhgBj4VQerVh3p8/g==\n-----END PRIVATE KEY-----\n',
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
