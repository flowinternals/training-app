import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const usersRef = adminDb.collection('users');
    const query = await usersRef.where('email', '==', email).get();
    
    if (query.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userDoc = query.docs[0];
    const userId = userDoc.id;
    
    // Restore admin role
    await usersRef.doc(userId).update({
      role: 'admin',
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: `Successfully restored admin role for ${email}`,
      userId: userId
    });

  } catch (error) {
    console.error('Error fixing admin role:', error);
    return NextResponse.json(
      { error: 'Failed to fix admin role' },
      { status: 500 }
    );
  }
}
