'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useAuth } from './context/auth-context';

export default function Home() {
  const { user } = useAuth();
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-center">
            TheraScheduler
          </h1>
          <p className="text-xl text-center max-w-2xl">
            Streamline your therapy practice with our easy-to-use scheduling system.
          </p>
          <div className="flex space-x-4 mt-8">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white">
              <Link href="/book">
                Book an Appointment
              </Link>
            </Button>
            {user ? (
              <Button asChild size="lg" className="bg-gray-400 hover:bg-gray-500 text-white">
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="bg-gray-400 hover:bg-gray-500 text-white">
                <Link href="/auth/login">
                  Therapist Login
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Easy Scheduling</h3>
            <p>Manage your availability and appointments with ease</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Calendar Integration</h3>
            <p>Sync with Google Calendar automatically</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Smart Notifications</h3>
            <p>Automated email and SMS reminders</p>
          </div>
        </div>
      </div>
    </main>
  );
}
