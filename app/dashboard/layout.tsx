'use client';

import ProtectedRoute from '@/app/components/auth/protected-route';
import { useAuth } from '@/app/context/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/dashboard" className="text-xl font-bold">
              TheraScheduler
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className={isActive('/dashboard')}>
                Dashboard
              </Link>
              <Link href="/dashboard/appointments" className={isActive('/dashboard/appointments')}>
                Appointments
              </Link>
              <Link href="/dashboard/availability" className={isActive('/dashboard/availability')}>
                Availability
              </Link>
              <Link href="/dashboard/profile" className={isActive('/dashboard/profile')}>
                Profile
              </Link>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </nav>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} TheraScheduler. All rights reserved.
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
} 