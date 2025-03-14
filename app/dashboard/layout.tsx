'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check for authentication on client side
  useEffect(() => {
    if (isClient && !loading) {
      // If not authenticated, redirect to login
      if (!user) {
        console.log('No user found in dashboard layout, redirecting to login');
        
        // Check if we just logged in (to prevent redirect loops)
        const justLoggedIn = localStorage.getItem('therascheduler-login-success');
        if (justLoggedIn) {
          console.log('Just logged in, not redirecting');
          localStorage.removeItem('therascheduler-login-success');
          return;
        }
        
        window.location.href = '/auth/login?redirectTo=' + window.location.pathname;
      } else {
        console.log('User authenticated in dashboard layout:', user.email);
      }
    }
  }, [user, loading, isClient, router]);

  // Show loading state while checking authentication
  if (loading || !isClient) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and on client side, show loading while redirecting
  if (!user && isClient) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    return pathname === path ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-primary/5">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xl font-bold">
              TheraScheduler
            </Link>
            <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">Therapist Portal</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className={isActive('/dashboard')}>
              Dashboard
            </Link>
            <Link href="/dashboard/appointments" className={isActive('/dashboard/appointments')}>
              Appointments
            </Link>
            <Link href="/dashboard/availability" className={isActive('/dashboard/availability')}>
              Availability
            </Link>
            <Link href="/dashboard/widget" className={isActive('/dashboard/widget')}>
              Booking Widget
            </Link>
            <Link href="/dashboard/profile" className={isActive('/dashboard/profile')}>
              Profile
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                View Public Site
              </Link>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </nav>
          
          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle>Menu</SheetTitle>
              <nav className="flex flex-col gap-4 mt-6">
                <Link 
                  href="/dashboard" 
                  className={`text-sm font-medium ${isActive('/dashboard')}`}
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/dashboard/appointments" 
                  className={`text-sm font-medium ${isActive('/dashboard/appointments')}`}
                  onClick={() => setIsOpen(false)}
                >
                  Appointments
                </Link>
                <Link 
                  href="/dashboard/availability" 
                  className={`text-sm font-medium ${isActive('/dashboard/availability')}`}
                  onClick={() => setIsOpen(false)}
                >
                  Availability
                </Link>
                <Link 
                  href="/dashboard/widget" 
                  className={`text-sm font-medium ${isActive('/dashboard/widget')}`}
                  onClick={() => setIsOpen(false)}
                >
                  Booking Widget
                </Link>
                <Link 
                  href="/dashboard/profile" 
                  className={`text-sm font-medium ${isActive('/dashboard/profile')}`}
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </Link>
                <div className="flex flex-col gap-2 mt-4">
                  <Link 
                    href="/" 
                    className="text-sm text-gray-600 hover:text-primary"
                    onClick={() => setIsOpen(false)}
                  >
                    View Public Site
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                    className="mt-2"
                  >
                    Sign Out
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="border-t">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              © {new Date().getFullYear()} TheraScheduler. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">About</Link>
              <Link href="/contact" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Contact</Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 