import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication - only admins can access user data
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('API - Fetching user statistics...');
    
    // Get all users
    const usersSnapshot = await adminDb.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const totalUsers = users.length;
    const adminUsers = users.filter(user => user.role === 'admin').length;
    const regularUsers = users.filter(user => user.role !== 'admin').length;
    const usersWithProgress = users.filter(user => user.progress && Object.keys(user.progress).length > 0).length;
    
    console.log('API - User statistics retrieved:', { totalUsers, adminUsers, regularUsers, usersWithProgress });
    
    return NextResponse.json({
      success: true,
      count: totalUsers,
      adminCount: adminUsers,
      regularCount: regularUsers,
      usersWithProgress: usersWithProgress,
      message: `Found ${totalUsers} users (${adminUsers} admins, ${regularUsers} regular)`
    });
  } catch (error) {
    console.error('Error fetching user count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user count' },
      { status: 500 }
    );
  }
}
