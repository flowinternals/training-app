'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getAllUserProgress, getCourseById } from '@/lib/firebase-utils';
import { UserProgress, Course } from '@/types';
import { BookOpen, Calendar, User, Crown, Clock, CreditCard, Play, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import SubscriptionManager from '@/components/payments/SubscriptionManager';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressWithNames, setProgressWithNames] = useState<Array<UserProgress & {
    courseName: string;
    moduleName: string;
    lessonName: string;
  }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadUserData();
    } else if (!authLoading) {
      // Redirect to home page if not authenticated and auth is not loading
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Refresh data when user returns to the dashboard (e.g., from a course)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        console.log('Dashboard focused, refreshing user data...');
        loadUserData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      console.log('Loading user data for:', user.uid);
      // Load user progress
      const userProgress = await getAllUserProgress(user.uid);
      console.log('Loaded progress:', userProgress.length, 'items');
      setProgress(userProgress);
      
      // Load enrolled courses from API
      if (user.enrolledCourses && user.enrolledCourses.length > 0) {
        const coursePromises = user.enrolledCourses.map(async courseId => {
          try {
            const response = await fetch(`/api/courses/${courseId}`);
            if (!response.ok) {
              if (response.status === 404) {
                console.log(`Course ${courseId} not found, probably deleted`);
                return null;
              }
              throw new Error('Failed to fetch course');
            }
            return await response.json();
          } catch (error) {
            console.error(`Error loading course ${courseId}:`, error);
            return null;
          }
        });
        const courses = await Promise.all(coursePromises);
        setEnrolledCourses(courses.filter(course => course !== null) as Course[]);
      }

      // Resolve names for progress items (filter out deleted courses)
      await resolveProgressNames(userProgress);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveProgressNames = async (userProgress: UserProgress[]) => {
    try {
      const progressWithNames = await Promise.all(
        userProgress.map(async (item) => {
          try {
            const response = await fetch(`/api/courses/${item.courseId}`);
            if (!response.ok) {
              if (response.status === 404) {
                console.warn(`Course ${item.courseId} not found - this should have been cleaned up. Consider running orphaned data cleanup.`);
                return null; // Filter out progress for deleted courses
              }
              throw new Error('Failed to fetch course');
            }
            const course = await response.json();
            const module = course.modules?.find((m: any) => m.id === item.moduleId);
            const lesson = module?.lessons?.find((l: any) => l.id === item.lessonId);
            
            return {
              ...item,
              courseName: course.title,
              moduleName: module?.title || 'Unknown Module',
              lessonName: lesson?.title || 'Unknown Lesson'
            };
          } catch (error) {
            console.error(`Error resolving names for progress item:`, error);
            // If course not found or any other error, return null to filter it out
            return null;
          }
        })
      );
      
      // Filter out null values (deleted courses)
      const validProgress = progressWithNames.filter(item => item !== null);
      setProgressWithNames(validProgress);
    } catch (error) {
      console.error('Error resolving progress names:', error);
      setProgressWithNames([]);
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

  // Sort progress by date (most recent first) and paginate
  const sortedProgress = [...progressWithNames].sort((a, b) => {
    // Use completedAt if available, otherwise use lastAccessed
    const dateA = a.completed ? (a.completedAt || a.lastAccessed) : a.lastAccessed;
    const dateB = b.completed ? (b.completedAt || b.lastAccessed) : b.lastAccessed;
    return dateB.getTime() - dateA.getTime();
  });

  const totalPages = Math.ceil(sortedProgress.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProgress = sortedProgress.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

        {/* Enrolled Courses */}
        {enrolledCourses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Courses</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => {
                  const courseProgress = progress.filter(p => p.courseId === course.id);
                  const completedLessons = courseProgress.filter(p => p.completed).length;
                  
                  // Calculate total lessons from course structure, not from progress records
                  const totalLessons = course.modules?.reduce((total, module) => {
                    return total + (module.lessons?.length || 0);
                  }, 0) || 0;
                  
                  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                  
                  // Debug logging
                  console.log(`Course ${course.title}:`, {
                    completedLessons,
                    totalLessons,
                    progressPercentage,
                    courseProgress: courseProgress.length
                  });
                  
                  return (
                    <div key={course.id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      {/* Course Image */}
                      <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600">
                        {course.thumbnail ? (
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <BookOpen className="h-8 w-8 text-white opacity-80" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                            Enrolled
                          </span>
                        </div>
                      </div>
                      
                      {/* Course Content */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {course.description}
                        </p>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {/* Course Stats */}
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{course.duration} min</span>
                          </div>
                          <div className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            <span>{completedLessons}/{totalLessons} lessons</span>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <Link
                          href={`/courses/${course.id}`}
                          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Continue Learning
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h2>
            <button
              onClick={() => {
                console.log('Manual refresh triggered');
                setCurrentPage(1); // Reset to first page on refresh
                loadUserData();
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              Refresh
            </button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading your progress...</p>
              </div>
            ) : enrolledCourses.length === 0 && progressWithNames.length === 0 ? (
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
            ) : progressWithNames.length > 0 ? (
              <>
                <div className="space-y-4">
                  {paginatedProgress.map((item, index) => (
                    <div key={`${item.courseId}-${item.moduleId}-${item.lessonId}`} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          item.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.completed ? 'Completed' : 'Started'} "{item.lessonName}"
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.courseName} • {item.moduleName}
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
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {startIndex + 1} to {Math.min(endIndex, sortedProgress.length)} of {sortedProgress.length} activities
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 text-sm border rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No recent activity. Start learning!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
