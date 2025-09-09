import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export { stripe };

export interface CreateCheckoutSessionParams {
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateSubscriptionParams {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export class StripeService {
  static async createCheckoutSession(params: CreateCheckoutSessionParams) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: params.courseTitle,
                description: `Access to ${params.courseTitle} course`,
              },
              unit_amount: Math.round(params.coursePrice * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.userEmail,
        metadata: {
          courseId: params.courseId,
          userId: params.userId,
        },
      });

      return { success: true, sessionId: session.id, url: session.url };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return { success: false, error: 'Failed to create checkout session' };
    }
  }

  static async createSubscription(params: CreateSubscriptionParams) {
    try {
      // First, create or retrieve customer
      const customers = await stripe.customers.list({
        email: params.userEmail,
        limit: 1,
      });

      let customer;
      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: params.userEmail,
          metadata: {
            userId: params.userId,
          },
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer: customer.id,
        metadata: {
          userId: params.userId,
        },
      });

      return { success: true, sessionId: session.id, url: session.url };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return { success: false, error: 'Failed to create subscription' };
    }
  }

  static async retrieveSession(sessionId: string) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return { success: true, session };
    } catch (error) {
      console.error('Error retrieving session:', error);
      return { success: false, error: 'Failed to retrieve session' };
    }
  }

  static async createPaymentIntent(amount: number, currency: string = 'usd') {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return { success: true, clientSecret: paymentIntent.client_secret };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return { success: false, error: 'Failed to create payment intent' };
    }
  }

  static async retrievePaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return { success: true, paymentIntent };
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      return { success: false, error: 'Failed to retrieve payment intent' };
    }
  }

  static async createRefund(paymentIntentId: string, amount?: number) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return { success: true, refund };
    } catch (error) {
      console.error('Error creating refund:', error);
      return { success: false, error: 'Failed to create refund' };
    }
  }

  static async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return { success: true, subscription };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return { success: false, error: 'Failed to cancel subscription' };
    }
  }

  static async retrieveSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return { success: true, subscription };
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      return { success: false, error: 'Failed to retrieve subscription' };
    }
  }

  static async listCustomerSubscriptions(customerId: string) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
      });
      return { success: true, subscriptions: subscriptions.data };
    } catch (error) {
      console.error('Error listing subscriptions:', error);
      return { success: false, error: 'Failed to list subscriptions' };
    }
  }

  static async constructWebhookEvent(body: string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      return { success: true, event };
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      return { success: false, error: 'Invalid webhook signature' };
    }
  }
}
