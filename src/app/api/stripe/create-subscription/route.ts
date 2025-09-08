import { NextRequest, NextResponse } from 'next/server';
import { StripeService, CreateSubscriptionParams } from '@/lib/stripe';
import { verifyAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid, email } = authResult.user;
    const body = await request.json();

    // Validate required fields
    const { priceId, successUrl, cancelUrl } = body;
    
    if (!priceId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    const params: CreateSubscriptionParams = {
      priceId,
      userId: uid,
      userEmail: email || '',
      successUrl,
      cancelUrl,
    };

    const result = await StripeService.createSubscription(params);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url,
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
