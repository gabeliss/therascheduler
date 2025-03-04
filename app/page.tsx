import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to TheraScheduler
        </h1>
        <p className="text-xl text-center mb-12">
          Streamline your therapy practice with our efficient scheduling platform
        </p>
        
        <div className="flex justify-center gap-4">
          <Link href="/auth/login">
            <Button variant="default">Login as Therapist</Button>
          </Link>
          <Link href="/book">
            <Button variant="outline">Book Appointment</Button>
          </Link>
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
