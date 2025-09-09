'use client';

import { useState } from 'react';
import { Course } from '@/types';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentButtonProps {
  course: Course;
  userId: string;
  userEmail: string;
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: string) => void;
}

export default function PaymentButton({ 
  course, 
  userId, 
  userEmail, 
  onPaymentSuccess, 
  onPaymentError 
}: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { refreshUserData } = useAuth();

  const handlePayment = async () => {
    if (course.isFree) {
      // Handle free course enrollment
      try {
        // Get the current user's ID token for authentication
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not authenticated');
        }

        const idToken = await user.getIdToken();
        
        const response = await fetch('/api/courses/enroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            courseId: course.id,
            userId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to enroll in free course');
        }

        // Refresh user data to update enrolled courses
        await refreshUserData();
        onPaymentSuccess?.();
      } catch (error) {
        console.error('Error enrolling in free course:', error);
        onPaymentError?.(error instanceof Error ? error.message : 'Failed to enroll in course');
      }
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.id,
          courseTitle: course.title,
          coursePrice: course.price,
          successUrl: `${window.location.origin}/courses/${course.id}?payment=success`,
          cancelUrl: `${window.location.origin}/courses/${course.id}?payment=cancelled`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      onPaymentError?.('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={isProcessing}
      className={`
        w-full px-6 py-3 rounded-lg font-semibold text-white transition-colors
        ${course.isFree 
          ? 'bg-green-600 hover:bg-green-700' 
          : 'bg-blue-600 hover:bg-blue-700'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {isProcessing ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          Processing...
        </div>
      ) : course.isFree ? (
        'Enroll for Free'
      ) : (
        `Enroll for $${course.price.toFixed(2)}`
      )}
    </button>
  );
}
