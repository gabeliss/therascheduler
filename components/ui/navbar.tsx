'use client';

import Link from 'next/link';
import { Button } from './button';
import { useAuth } from '@/app/context/auth-context';
import { usePathname } from 'next/navigation';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  
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
            <div className="flex items-center gap-2">
              <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    Log in <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2 font-medium">
                    Clients
                  </div>
                  <DropdownMenuItem asChild onClick={() => setOpen(false)}>
                    <Link href="/auth/client-login" className="cursor-pointer w-full">
                      Log in
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="p-2 font-medium">
                    Therapists
                  </div>
                  <DropdownMenuItem asChild onClick={() => setOpen(false)}>
                    <Link href="/auth/login" className="cursor-pointer w-full">
                      Log in
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
                <Link href="/auth/signup">
                  Sign up
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 