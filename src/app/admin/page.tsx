import AdminDashboard from '@/components/admin/AdminDashboard';
import Navigation from '@/components/Navigation';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <AdminDashboard />
    </div>
  );
}
