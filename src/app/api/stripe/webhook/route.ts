import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';
import { Payment, Subscription } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const result = await StripeService.constructWebhookEvent(body, signature);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const event = result.event;

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  try {
    const { courseId, userId } = session.metadata;
    
    if (!courseId || !userId) {
      console.error('Missing metadata in checkout session:', session.id);
      return;
    }

    // Record the payment
    const payment: Payment = {
      id: `payment_${Date.now()}`,
      userId,
      courseId,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      status: 'completed',
      stripePaymentIntentId: session.payment_intent,
      createdAt: new Date(),
    };

    await db.collection('payments').doc(payment.id).set(payment);

    // Enroll user in course
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      enrolledCourses: db.FieldValue.arrayUnion(courseId),
      updatedAt: new Date(),
    });

    console.log(`Payment completed for user ${userId}, course ${courseId}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  try {
    // Update payment status if it exists
    const paymentsQuery = await db.collection('payments')
      .where('stripePaymentIntentId', '==', paymentIntent.id)
      .limit(1)
      .get();

    if (!paymentsQuery.empty) {
      const paymentDoc = paymentsQuery.docs[0];
      await paymentDoc.ref.update({
        status: 'completed',
      });
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    const userId = subscription.metadata.userId;
    
    if (!userId) {
      console.error('Missing userId in subscription metadata:', subscription.id);
      return;
    }

    const subscriptionData: Subscription = {
      id: subscription.id,
      userId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: new Date(),
    };

    await db.collection('subscriptions').doc(subscription.id).set(subscriptionData);

    // Update user subscription status
    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'active',
      subscriptionExpiry: subscriptionData.currentPeriodEnd,
      updatedAt: new Date(),
    });

    console.log(`Subscription created for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const subscriptionRef = db.collection('subscriptions').doc(subscription.id);
    const subscriptionDoc = await subscriptionRef.get();

    if (subscriptionDoc.exists) {
      await subscriptionRef.update({
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });

      // Update user subscription status
      const userId = subscription.metadata.userId;
      if (userId) {
        await db.collection('users').doc(userId).update({
          subscriptionStatus: subscription.status,
          subscriptionExpiry: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    const subscriptionRef = db.collection('subscriptions').doc(subscription.id);
    await subscriptionRef.update({
      status: 'cancelled',
    });

    // Update user subscription status
    const userId = subscription.metadata.userId;
    if (userId) {
      await db.collection('users').doc(userId).update({
        subscriptionStatus: 'cancelled',
        updatedAt: new Date(),
      });
    }

    console.log(`Subscription cancelled: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    if (invoice.subscription) {
      // Update subscription status
      await db.collection('subscriptions').doc(invoice.subscription).update({
        status: 'active',
      });

      // Update user subscription status
      const subscriptionDoc = await db.collection('subscriptions').doc(invoice.subscription).get();
      if (subscriptionDoc.exists) {
        const subscriptionData = subscriptionDoc.data();
        if (subscriptionData?.userId) {
          await db.collection('users').doc(subscriptionData.userId).update({
            subscriptionStatus: 'active',
            subscriptionExpiry: new Date(invoice.period_end * 1000),
            updatedAt: new Date(),
          });
        }
      }
    }
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
    if (invoice.subscription) {
      // Update subscription status
      await db.collection('subscriptions').doc(invoice.subscription).update({
        status: 'inactive',
      });

      // Update user subscription status
      const subscriptionDoc = await db.collection('subscriptions').doc(invoice.subscription).get();
      if (subscriptionDoc.exists) {
        const subscriptionData = subscriptionDoc.data();
        if (subscriptionData?.userId) {
          await db.collection('users').doc(subscriptionData.userId).update({
            subscriptionStatus: 'inactive',
            updatedAt: new Date(),
          });
        }
      }
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}
