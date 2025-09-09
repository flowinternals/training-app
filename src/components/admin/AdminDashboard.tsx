'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getAllCourses, createCourseWithModules } from '@/lib/firebase-utils';
import { Course, Module } from '@/types';
import { BookOpen, Users, Plus, Edit, Trash2, Eye, BarChart3, Settings, UserCheck, UserX, Copy } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, firebaseUser } = useAuth();
  const { addToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalUsers: 0,
    adminUsers: 0,
    regularUsers: 0,
    usersWithProgress: 0,
  });
  const [initialized, setInitialized] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteMessage, setPromoteMessage] = useState('');
  const [promoteMessageType, setPromoteMessageType] = useState<'success' | 'error'>('success');
  const [cloningCourse, setCloningCourse] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  // Always fetch fresh data from Firebase API
  const loadAdminData = async () => {
    try {
      setLoading(true);
      console.log('AdminDashboard - Fetching fresh courses from Firebase API...');
      
      // Fetch fresh data from Firebase API instead of using cached data
      const response = await fetch('/api/courses');
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      const allCourses = await response.json();
      
      console.log('AdminDashboard - Fresh courses loaded from API:', allCourses);
      console.log('AdminDashboard - Number of courses:', allCourses.length);
      setCourses(allCourses);
      
      // Fetch user statistics from the API
      let userStats = {
        totalUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        usersWithProgress: 0,
      };
      
      try {
        const usersResponse = await fetch('/api/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          userStats = {
            totalUsers: usersData.count || 0,
            adminUsers: usersData.adminCount || 0,
            regularUsers: usersData.regularCount || 0,
            usersWithProgress: usersData.usersWithProgress || 0,
          };
          console.log('AdminDashboard - Loaded user statistics:', userStats);
        }
      } catch (userError) {
        console.warn('Error fetching user statistics:', userError);
        // Continue without user stats if it fails
      }
      
      // Calculate stats
      setStats({
        totalCourses: allCourses.length,
        publishedCourses: allCourses.filter(c => c.published).length,
        draftCourses: allCourses.filter(c => !c.published).length,
        ...userStats,
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
      addToast('Error loading admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    if (user && user.role === 'admin' && !initialized) {
      loadAdminData();
      setInitialized(true);
    }
  }, [user, initialized]);

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteLoading(true);

    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: promoteEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'User Promoted',
          message: data.message || 'User has been promoted to admin successfully'
        });
        setPromoteEmail('');
      } else {
        addToast({
          type: 'error',
          title: 'Promotion Failed',
          message: data.error || 'Failed to promote user to admin'
        });
      }
    } catch (error: any) {
      console.error('Error promoting user:', error);
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Please try again'
      });
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleCloneCourse = async (courseId: string) => {
    try {
      setCloningCourse(courseId);
      
      // Use the clone API endpoint
      const response = await fetch(`/api/courses/${courseId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clone course');
      }

      const result = await response.json();
      
      addToast({
        type: 'success',
        title: 'Course Cloned Successfully',
        message: 'Course has been cloned and added to your courses list'
      });
      
      // Refresh the courses list to show the new cloned course
      loadAdminData();
      
    } catch (error) {
      console.error('Error cloning course:', error);
      addToast({
        type: 'error',
        title: 'Clone Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setCloningCourse(null);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone and will remove all user progress for this course.`)) {
      return;
    }

    try {
      setDeletingCourse(courseId);
      console.log('AdminDashboard - Deleting course:', courseId);
      
      // Get auth token
      const idToken = await firebaseUser?.getIdToken();
      
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });
      console.log('AdminDashboard - Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete course');
      }

      const result = await response.json();
      const cleanupInfo = result.cleanup || { deletedRecords: { userProgress: 0 } };
      
      addToast({
        type: 'success',
        title: 'Course Deleted',
        message: `"${courseTitle}" has been deleted successfully. Cleaned up ${cleanupInfo.deletedRecords.userProgress} user progress records.`
      });
      
      // Refresh the courses list to reflect the deletion
      loadAdminData();
    } catch (error) {
      console.error('Error deleting course:', error);
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setDeletingCourse(null);
    }
  };

  const handleCleanupOrphanedData = async () => {
    if (!confirm('This will clean up orphaned progress records for deleted courses. Continue?')) {
      return;
    }

    try {
      setCleaningUp(true);
      console.log('AdminDashboard - Cleaning up orphaned data...');
      
      // Get auth token
      const idToken = await firebaseUser?.getIdToken();
      
      const response = await fetch('/api/cleanup-orphaned-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clean up orphaned data');
      }

      const result = await response.json();
      
      addToast({
        type: 'success',
        title: 'Cleanup Complete',
        message: `Cleaned up ${result.cleaned} orphaned progress records`
      });
      
    } catch (error) {
      console.error('Error cleaning up orphaned data:', error);
      addToast({
        type: 'error',
        title: 'Cleanup Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setCleaningUp(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need admin privileges to access this area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your Skillforge platform
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
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Courses</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.totalCourses}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Eye className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Published</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.publishedCourses}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Edit className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Drafts</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.draftCourses}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Admin Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.adminUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserX className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Regular Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.regularUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Learners</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.usersWithProgress}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/admin/courses/create"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Create Course</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Build a new training course</p>
                </div>
              </Link>

              <Link
                href="/admin/users"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Users className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Manage Users</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View and edit user accounts</p>
                </div>
              </Link>

              <Link
                href="/admin/analytics"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Analytics</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View platform statistics</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">User Management</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handlePromoteUser} className="space-y-4">
              <div>
                <label htmlFor="promoteEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Promote User to Admin
                </label>
                <div className="flex gap-2">
                  <input
                    id="promoteEmail"
                    type="email"
                    required
                    value={promoteEmail}
                    onChange={(e) => setPromoteEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@example.com"
                  />
                  <button
                    type="submit"
                    disabled={promoteLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {promoteLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Promote
                      </>
                    )}
                  </button>
                </div>
              </div>

              {promoteMessage && (
                <div className={`rounded-md p-3 text-sm ${
                  promoteMessageType === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                }`}>
                  {promoteMessage}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Data Cleanup */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Data Cleanup</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Clean Orphaned Data</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Remove progress records for deleted courses
                </p>
              </div>
              <button
                onClick={handleCleanupOrphanedData}
                disabled={cleaningUp}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cleaningUp ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Clean Up
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Courses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Courses</h2>
              <Link
                href="/admin/courses"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading courses...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No courses created yet.</p>
                <Link
                  href="/admin/courses/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Course
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.slice(0, 5).map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {course.thumbnail ? (
                          <img
                            className="h-12 w-12 rounded-lg object-cover"
                            src={course.thumbnail}
                            alt={course.title}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {course.category} • {course.difficulty} • {course.duration} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        course.published
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {course.published ? 'Published' : 'Draft'}
                      </span>
                      <div className="flex space-x-1">
                        <Link
                          href={`/courses/${course.id}`}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="View Course"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/courses/${course.id}/edit`}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Edit Course"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button 
                          onClick={() => handleCloneCourse(course.id)}
                          disabled={cloningCourse === course.id}
                          className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
                          title="Clone Course"
                        >
                          {cloningCourse === course.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          disabled={deletingCourse === course.id}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50" 
                          title="Delete Course"
                        >
                          {deletingCourse === course.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
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
