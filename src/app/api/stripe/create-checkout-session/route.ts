import { NextRequest, NextResponse } from 'next/server';
import { StripeService, CreateCheckoutSessionParams } from '@/lib/stripe';
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
    const { courseId, courseTitle, coursePrice, successUrl, cancelUrl } = body;
    
    if (!courseId || !courseTitle || coursePrice === undefined || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (coursePrice <= 0) {
      return NextResponse.json(
        { error: 'Course price must be greater than 0' },
        { status: 400 }
      );
    }

    const params: CreateCheckoutSessionParams = {
      courseId,
      courseTitle,
      coursePrice,
      userId: uid,
      userEmail: email || '',
      successUrl,
      cancelUrl,
    };

    const result = await StripeService.createCheckoutSession(params);

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
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
