'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useAuth } from './context/auth-context';
import { CalendarDays, Bell, Calendar, ArrowRight, CheckCircle, User, UserCog } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section with gradient background */}
      <section className="relative bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              TheraScheduler
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-10">
              Connecting therapists and clients through seamless scheduling
            </p>
            
            {!user ? (
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white" asChild>
                  <Link href="/book" className="flex items-center gap-2">
                    <User size={18} /> Book as Client
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-gray-300" asChild>
                  <Link href="/auth/signup" className="flex items-center gap-2">
                    <UserCog size={18} /> Register as Therapist
                  </Link>
                </Button>
              </div>
            ) : (
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white" asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            )}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 hidden lg:block">
          <div className="w-24 h-24 rounded-full bg-blue-100/60 blur-xl"></div>
        </div>
        <div className="absolute bottom-20 right-10 hidden lg:block">
          <div className="w-32 h-32 rounded-full bg-purple-100/60 blur-xl"></div>
        </div>
      </section>

      {/* Two-column section for both user types */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Client/Patient Column */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-blue-600">For Clients</h2>
              <p className="text-gray-600 mb-6">
                Find and book appointments with qualified therapists in just a few clicks.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Easy online booking - no phone calls needed</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Automatic appointment reminders</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Secure messaging with your therapist</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>View your complete appointment history</span>
                </li>
              </ul>
              <div className="mt-8">
                <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                  <Link href="/book">Book Your Appointment</Link>
                </Button>
              </div>
            </div>
            
            {/* Therapist Column */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-purple-600">For Therapists</h2>
              <p className="text-gray-600 mb-6">
                Streamline your practice with our powerful scheduling platform.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Manage your availability with ease</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Reduce no-shows with automated reminders</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Sync with your Google Calendar</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>HIPAA-compliant client management</span>
                </li>
              </ul>
              <div className="mt-8">
                <Button className="bg-purple-600 hover:bg-purple-700" asChild>
                  <Link href="/auth/signup">Register Your Practice</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - keep this as you liked it */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Platform Features</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
            Designed to make scheduling simple for everyone
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px]">
              <div className="bg-blue-100 p-3 rounded-full w-fit mb-6">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Easy Scheduling</h3>
              <p className="text-gray-600">Intuitive booking system that works for both therapists and clients.</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px]">
              <div className="bg-purple-100 p-3 rounded-full w-fit mb-6">
                <CalendarDays className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Calendar Integration</h3>
              <p className="text-gray-600">Sync with Google Calendar to keep all your schedules in one place.</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px]">
              <div className="bg-green-100 p-3 rounded-full w-fit mb-6">
                <Bell className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Notifications</h3>
              <p className="text-gray-600">Automated email and SMS reminders to ensure everyone stays informed.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section - new section for clarity */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
            A simple process for both clients and therapists
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Client Process */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-blue-600">For Clients</h3>
              <ol className="space-y-6">
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
                  <div>
                    <h4 className="font-semibold text-lg">Browse Available Therapists</h4>
                    <p className="text-gray-600">Find therapists with availability that matches your schedule.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">2</div>
                  <div>
                    <h4 className="font-semibold text-lg">Select a Time Slot</h4>
                    <p className="text-gray-600">Choose from available appointment times that work for you.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">3</div>
                  <div>
                    <h4 className="font-semibold text-lg">Confirm Your Booking</h4>
                    <p className="text-gray-600">Receive confirmation and reminders for your upcoming appointment.</p>
                  </div>
                </li>
              </ol>
            </div>
            
            {/* Therapist Process */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-purple-600">For Therapists</h3>
              <ol className="space-y-6">
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">1</div>
                  <div>
                    <h4 className="font-semibold text-lg">Set Your Availability</h4>
                    <p className="text-gray-600">Define when you're available for appointments on a recurring basis.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">2</div>
                  <div>
                    <h4 className="font-semibold text-lg">Receive Booking Requests</h4>
                    <p className="text-gray-600">Get notified when clients request appointments during your available hours.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">3</div>
                  <div>
                    <h4 className="font-semibold text-lg">Manage Your Schedule</h4>
                    <p className="text-gray-600">Approve requests and manage your calendar all in one place.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonial Section - keep but make it balanced */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">What Our Users Say</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Therapist Testimonial */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full mb-4 flex items-center justify-center">
                  <UserCog className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-lg italic text-gray-700 mb-4">
                  "TheraScheduler has transformed how I manage my practice. My clients love the easy booking process, and I've reduced no-shows by 40%."
                </p>
                <p className="font-semibold">Dr. Sarah Johnson</p>
                <p className="text-sm text-gray-500">Clinical Psychologist</p>
              </div>
            </div>
            
            {/* Client Testimonial */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full mb-4 flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-lg italic text-gray-700 mb-4">
                  "I used to dread scheduling therapy appointments. With TheraScheduler, I can book sessions in seconds and never miss an appointment thanks to the reminders."
                </p>
                <p className="font-semibold">Michael Rodriguez</p>
                <p className="text-sm text-gray-500">Client</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of therapists and clients who are simplifying mental healthcare scheduling.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
                <Link href="/book">Book as Client</Link>
              </Button>
              <Button size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white/10" asChild>
                <Link href="/auth/signup">Register as Therapist</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold mb-2">TheraScheduler</h3>
              <p className="text-gray-400">© {new Date().getFullYear()} All rights reserved.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-4">
              <Link href="/about" className="hover:text-blue-300 transition-colors">About</Link>
              <Link href="/contact" className="hover:text-blue-300 transition-colors">Contact</Link>
              <Link href="/privacy" className="hover:text-blue-300 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-blue-300 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
