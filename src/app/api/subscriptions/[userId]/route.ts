import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const uid = authResult.user?.uid;
    
    if (!uid) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }

    // Verify user can access this subscription
    if (uid !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's active subscription
    console.log('Fetching subscription for userId:', userId);
    
    const subscriptionsQuery = await adminDb.collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', 'in', ['active', 'inactive'])
      .get();
    
    console.log('Found subscriptions:', subscriptionsQuery.docs.length);

    if (subscriptionsQuery.empty) {
      return NextResponse.json({
        success: true,
        subscription: null,
      });
    }

    // Sort by createdAt if it exists, otherwise just take the first one
    const sortedDocs = subscriptionsQuery.docs.sort((a, b) => {
      const aData = a.data();
      const bData = b.data();
      const aCreated = aData.createdAt?.toDate?.() || new Date(0);
      const bCreated = bData.createdAt?.toDate?.() || new Date(0);
      return bCreated.getTime() - aCreated.getTime();
    });

    const subscriptionDoc = sortedDocs[0];
    const subscriptionData = subscriptionDoc.data();
    
    const subscription = {
      id: subscriptionDoc.id,
      ...subscriptionData,
      // Convert Firestore timestamps to ISO strings
      createdAt: subscriptionData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      currentPeriodStart: subscriptionData.currentPeriodStart?.toDate?.()?.toISOString() || new Date().toISOString(),
      currentPeriodEnd: subscriptionData.currentPeriodEnd?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    console.log('Returning subscription:', subscription);

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
