import CourseList from '@/components/courses/CourseList';
import Navigation from '@/components/Navigation';

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Available Courses
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Discover our collection of training courses
          </p>
        </div>
        <CourseList />
      </div>
    </div>
  );
}
