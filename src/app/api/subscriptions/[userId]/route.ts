import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const { uid } = authResult.user;

    // Verify user can access this subscription
    if (uid !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's active subscription
    const subscriptionsQuery = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', 'in', ['active', 'inactive'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (subscriptionsQuery.empty) {
      return NextResponse.json({
        success: true,
        subscription: null,
      });
    }

    const subscriptionDoc = subscriptionsQuery.docs[0];
    const subscription = {
      id: subscriptionDoc.id,
      ...subscriptionDoc.data(),
    };

    return NextResponse.json({
      success: true,
      subscription,
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
