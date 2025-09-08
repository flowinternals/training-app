import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }


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
