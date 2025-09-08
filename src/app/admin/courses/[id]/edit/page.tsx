'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Course, Module, Lesson } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import CourseForm from '@/components/courses/CourseForm';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface EditCoursePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditCoursePage({ params }: EditCoursePageProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const resolvedParams = use(params);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchCourse();
  }, [user, resolvedParams.id]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${resolvedParams.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Course not found');
        } else {
          setError('Failed to load course');
        }
        return;
      }

      const courseData = await response.json();
      setCourse(courseData);
    } catch (error) {
      console.error('Error fetching course:', error);
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseUpdated = (updatedCourse: Partial<Course>) => {
    // Update the course with the new data
    if (course) {
      setCourse({
        ...course,
        ...updatedCourse
      });
    }
    
    // Show success toast and redirect
    addToast({
      type: 'success',
      title: 'Course Updated',
      message: 'Course has been updated successfully!'
    });
    
    // Redirect after a short delay to show the toast
    setTimeout(() => {
      router.push('/admin');
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Error</h2>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => router.push('/admin')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Course not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The course you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit Course: {course.title}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Update your course details, modules, and lessons
          </p>
        </div>

        {/* Course Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <CourseForm
            initialCourse={course}
            onCourseSaved={handleCourseUpdated}
            mode="edit"
          />
        </div>
      </div>
    </div>
  );
}
