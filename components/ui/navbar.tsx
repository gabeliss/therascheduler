'use client';

import Link from 'next/link';
import { Button } from './button';
import { useAuth } from '@/app/context/auth-context';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  
  // Check if we're in the dashboard section
  const isDashboard = pathname?.startsWith('/dashboard');
  
  // If we're in the dashboard, don't show the public navbar
  if (isDashboard) {
    return null;
  }

  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            TheraScheduler
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              Home
            </Link>
            <Link href="/book" className="text-sm font-medium transition-colors hover:text-primary">
              Book Appointment
            </Link>
            <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium transition-colors hover:text-primary">
              Contact
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="default" size="sm" className="bg-gray-600 hover:bg-gray-500 text-white">
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Therapist Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
} 