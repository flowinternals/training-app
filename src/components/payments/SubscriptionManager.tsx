'use client';

import { useState, useEffect } from 'react';
import { Subscription } from '@/types';

interface SubscriptionManagerProps {
  userId: string;
  onSubscriptionUpdate?: (subscription: Subscription | null) => void;
}

export default function SubscriptionManager({ 
  userId, 
  onSubscriptionUpdate 
}: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [userId]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`/api/subscriptions/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        onSubscriptionUpdate?.(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async () => {
    if (!subscription) return;

    setIsCancelling(true);
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId,
        }),
      });

      if (response.ok) {
        await fetchSubscription(); // Refresh subscription data
      } else {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const createSubscription = async (priceId: string) => {
    try {
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: `${window.location.origin}/dashboard?subscription=cancelled`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to create subscription. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Subscription Plans</h3>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-lg">Pro Plan</h4>
            <p className="text-gray-600 mb-2">Access to all premium courses</p>
            <p className="text-2xl font-bold">$29.99/month</p>
            <button
              onClick={() => createSubscription('price_pro_monthly')}
              className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Subscribe to Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isActive = subscription.status === 'active';
  const isCancelled = subscription.status === 'cancelled';
  const willCancel = subscription.cancelAtPeriodEnd;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Your Subscription</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Status:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            isActive ? 'bg-green-100 text-green-800' : 
            isCancelled ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {isActive ? 'Active' : isCancelled ? 'Cancelled' : 'Inactive'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-medium">Current Period:</span>
          <span className="text-sm text-gray-600">
            {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {' '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </span>
        </div>

        {willCancel && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              Your subscription will be cancelled at the end of the current period.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {isActive && !willCancel && (
            <button
              onClick={cancelSubscription}
              disabled={isCancelling}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          )}
          
          {isCancelled && (
            <button
              onClick={() => createSubscription('price_pro_monthly')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reactivate Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
