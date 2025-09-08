import CourseForm from '@/components/courses/CourseForm';
import Navigation from '@/components/Navigation';

export default function CreateCoursePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <CourseForm />
    </div>
  );
}
