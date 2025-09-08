'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getUserProgress } from '@/lib/firebase-utils';
import { UserProgress } from '@/types';
import { BookOpen, Calendar, User, Crown, Clock, CreditCard } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import SubscriptionManager from '@/components/payments/SubscriptionManager';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadUserProgress();
    } else if (!authLoading) {
      // Redirect to home page if not authenticated and auth is not loading
      router.push('/');
    }
  }, [user, authLoading, router]);

  const loadUserProgress = async () => {
    if (!user) return;
    
    try {
      const userProgress = await getUserProgress(user.uid, 'all');
      setProgress(userProgress);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user and not loading, redirect will happen via useEffect
  if (!user) {
    return null;
  }

  const completedLessons = progress.filter(p => p.completed).length;
  const totalLessons = progress.length;
  const completionRate = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.displayName || 'Learner'}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track your progress and manage your learning journey
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Enrolled Courses</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {user.enrolledCourses.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lessons Completed</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {completedLessons}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {completionRate}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Type</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {user.role === 'admin' ? 'Admin' : user.role === 'paidUser' ? 'Premium' : 'Free'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Management */}
        {user.role !== 'admin' && (
          <div className="mb-8">
            <SubscriptionManager
              userId={user.uid}
              onSubscriptionUpdate={(subscription) => {
                // Update user role based on subscription status
                if (subscription?.status === 'active') {
                  // User has active subscription - could update role to paidUser
                }
              }}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/courses"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Browse Courses</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Discover new learning opportunities</p>
                </div>
              </Link>

              <Link
                href="/profile"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <User className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Edit Profile</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Update your information</p>
                </div>
              </Link>

              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Admin Panel</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage courses and users</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading your progress...</p>
              </div>
            ) : progress.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No activity yet. Start by enrolling in a course!</p>
                <Link
                  href="/courses"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {progress.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        item.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.completed ? 'Completed' : 'Started'} lesson
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Course: {item.courseId} • Module: {item.moduleId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.lastAccessed.toLocaleDateString()}
                      </p>
                      {item.completed && item.completedAt && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Completed {item.completedAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
