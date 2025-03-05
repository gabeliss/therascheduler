'use client';

import ProtectedRoute from '@/app/components/auth/protected-route';
import { useAuth } from '@/app/context/auth-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => {
    return pathname === path ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary';
  };

  return (
    <ProtectedRoute>
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
    </ProtectedRoute>
  );
} 