import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    // Using the actual service account credentials
    const serviceAccount = {
      type: "service_account",
      project_id: "flowinternals-training-app",
      private_key_id: "849ce596191a77d8064cd225958e0c0b4f8d148d",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDEBVsdcQSFmpzj\nhskrVgrwnn0lb7a5JJ9/flTGnmLba8G8WWiuJRU+GdVr+FLWqKVtXY9GfPtyk0JE\nlvjtdYZmeMBU1sSOfnvs5ou/RqpnUhb1XDOdGW20p/O9EirhRSCUCY8lTETQP0aU\nHHdLNSV0woKYx+SSGbOdYAXlNHhliw5QPi4jsyFpuY8HBNsemXjoiXJ1IHnP9yKp\nGVED2A336AtPPtLOy3H6kQOYZ5OD8TfaOasmN0eJAHjdLG9dLbQTFoaJg2+slX5S\nrkLxPrnsmOQTLuEsFM8nEVO5EwpkTQ9lHkLiCJ/eXCQ2pAp0KJEJXypriikWAtB/\nGTXepg+xAgMBAAECggEAPIV00N3EqiWHHB7Q/M7XmNwuQoE/9uDuV/Re42YimqGm\nEuu+DMqJSP+769ajaQBv9xjkdDyBfCooUzoTyGk5YmkU5PzceixmQcoayqdcVIM9\ncGsTyoT/4L/cWvuBfsUTnnFnH3pxYqSuu2sgj/lsQ6UMonRRR6Sk1sm/eDmflKX0\nOqdz1iUiqiAPwoUvYYKLPOVvmvXG7/k4pHD1ygACdFLa0AwAKwV+AT1btaAAXmd4\nNIkc5meJ7wEpTkCNwYNYSbyY6dplkeabnds9eQPZ4F8ff6pPPboW3WhKuRXSc8n1\n6Ii3My4i9E1jFgs9lCLrKfc+UcZ65AlN+++JhoFo+wKBgQDyBqNqfGF6FGSrGD4W\nKDZb+yQcpUnvTnujqswkgDQacKxSkuVJYQjRHB9tBO+0fek3X8lWHQtCspeUxHc7\nyTs8BJCGcAr7HpRQLBjslY4zfJapWt/AkH+orZFvdKP1auqcIAwYEjlXJZmeWf5I\n9xT0Gccyakv+2x3QGnR0RuSnBwKBgQDPVrjWXtgjCbdSXJfyZGAUbRl4Ma5fkbgD\niVKrCaL/JQO5QXXRIBvSf5ougpG80iyVL5GOZfKE50Xv1p4JQ3s3id9LPQLtvb5P\nSS5eHeHRQBPxfq1IPrPeCz0Gp/UmrcKoRiUQ27KwisEM5nelMdfzSPJ4A5x5gu/b\nPQ5nhmxthwKBgGr5YiuD9HXII8K4AWE7vuMi+xAqQqaicuWhbX/Ipr71BEWvJecs\nG4CJxJ4kK2sEqBtQnCYSylJdq8AWonjrdeIORm8VgNUD7BwPkaioZeT98X3Da9iq\nRbKhnQG9dWbZLf957r6I9408Ukz6i/lmNH28Ex6GezaXVPMRbl2ipBfrAoGAdGhx\nMFJhsRJUbZZ07O80DmPOh/AEwb1zffDMjCDF9dAXThyVhEsts7pWm0RNhKDPzRa+\n9x7/0WRznJt3cSYE+QKcboabrVT5k1Q4BzlpvmzmhZCkw0oI/GJ86c7E0el+v7Fa\nQCPJKFtO1epTRFk+sGXFVGJaqNI9zm5yNud+2uMCgYAx69jQm1muQXLPMITMgBrt\nwtZxaYgdtbCtSvuHKmCKYKHW7p/Xmf6ohdl4neeUnImGw1llHI0bYjCGocj5Y//V\nUG8HTy6ApFsgu9w+wy4UfuOWo9EaR7qM9fHNTO5JmUZQnPWmsDRcu6M/9E3+wx4n\ndtPeKqhgBj4VQerVh3p8/g==\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@flowinternals-training-app.iam.gserviceaccount.com",
      client_id: "107371175497899064267",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40flowinternals-training-app.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    };

    initializeApp({
      credential: cert(serviceAccount as any),
    });
    
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const adminAuth = getAuth();
    const adminDb = getFirestore();

    // Find user by email
    const userRecord = await adminAuth.getUserByEmail(email);
    
    if (!userRecord) {
      return NextResponse.json(
        { error: 'User not found with that email address' },
        { status: 404 }
      );
    }

    // Set custom claims for admin role
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      isAdmin: true
    });

    // Update Firestore document
    await adminDb.collection('users').doc(userRecord.uid).update({
      role: 'admin',
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: `Successfully promoted ${email} to admin role`,
      userId: userRecord.uid
    });

  } catch (error: any) {
    console.error('Error promoting user to admin:', error);
    return NextResponse.json(
      { error: 'Failed to promote user to admin. Please try again.' },
      { status: 500 }
    );
  }
}
