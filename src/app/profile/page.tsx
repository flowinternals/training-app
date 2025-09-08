import UserProfile from '@/components/auth/UserProfile';
import Navigation from '@/components/Navigation';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <UserProfile />
    </div>
  );
}
