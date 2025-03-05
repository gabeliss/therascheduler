'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useAuth } from './context/auth-context';
import { CalendarDays, Bell, Calendar, ArrowRight, CheckCircle, UserCog, Link as LinkIcon } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section with gradient background */}
      <section className="relative py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              TheraScheduler
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-10">
              Streamline your therapy practice with simple, client-friendly scheduling
            </p>
            
            {!user ? (
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white" asChild>
                <Link href="/auth/signup" className="flex items-center gap-2">
                  <UserCog size={18} /> Get Started
                </Link>
              </Button>
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

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
            Three simple steps to transform your scheduling process
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Set Your Availability</h3>
              <p className="text-gray-600">Define your working hours and appointment types in your personalized dashboard.</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <LinkIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Embed on Your Website</h3>
              <p className="text-gray-600">Add the booking widget to your website so clients can schedule directly.</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Approve Bookings</h3>
              <p className="text-gray-600">Review and approve appointment requests with a single click.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Powerful Features</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
            Everything you need to manage your therapy practice efficiently
          </p>
          
          <div className="max-w-6xl mx-auto">
            {/* Feature Row 1 */}
            <div className="flex flex-col md:flex-row mb-16">
              <div className="md:w-1/2 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold">Smart Scheduling System</h3>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Customizable appointment types with different durations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Buffer times between sessions to prepare for next client</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Recurring availability patterns to set once and forget</span>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2 p-6">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-blue-500 text-white p-3 flex justify-between items-center">
                    <span className="font-medium">October 2023</span>
                    <div className="flex gap-2">
                      <button className="p-1 hover:bg-blue-400 rounded">◀</button>
                      <button className="p-1 hover:bg-blue-400 rounded">▶</button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      <div className="text-center text-gray-500 text-sm">Su</div>
                      <div className="text-center text-gray-500 text-sm">Mo</div>
                      <div className="text-center text-gray-500 text-sm">Tu</div>
                      <div className="text-center text-gray-500 text-sm">We</div>
                      <div className="text-center text-gray-500 text-sm">Th</div>
                      <div className="text-center text-gray-500 text-sm">Fr</div>
                      <div className="text-center text-gray-500 text-sm">Sa</div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      <div className="text-center p-2 text-gray-400 text-sm">25</div>
                      <div className="text-center p-2 text-gray-400 text-sm">26</div>
                      <div className="text-center p-2 text-gray-400 text-sm">27</div>
                      <div className="text-center p-2 text-gray-400 text-sm">28</div>
                      <div className="text-center p-2 text-gray-400 text-sm">29</div>
                      <div className="text-center p-2 text-gray-400 text-sm">30</div>
                      <div className="text-center p-2 text-sm">1</div>
                    </div>
                    <div className="mt-4 border-t pt-4">
                      <div className="bg-blue-100 rounded-md p-3 mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-blue-800">Available Slots</span>
                          <span className="text-sm text-blue-600">Oct 15</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white rounded p-1 text-center text-sm border border-blue-200">9:00 AM</div>
                          <div className="bg-white rounded p-1 text-center text-sm border border-blue-200">10:30 AM</div>
                          <div className="bg-white rounded p-1 text-center text-sm border border-blue-200">1:00 PM</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Feature Row 2 */}
            <div className="flex flex-col md:flex-row mb-16">
              <div className="md:w-1/2 p-6 md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Bell className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold">Advanced Notification System</h3>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Customizable email templates for your brand</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>SMS reminders at 24h, 2h, or custom intervals</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Automatic notifications for schedule changes</span>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2 p-6 md:order-1">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 border border-purple-100 rounded-lg bg-purple-50">
                      <Bell className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium mb-1">Appointment Reminder</p>
                        <p className="text-sm text-gray-600">Your session with Dr. Smith is tomorrow at 2:00 PM</p>
                        <div className="flex gap-2 mt-2">
                          <button className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm">Confirm</button>
                          <button className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm">Reschedule</button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 border border-blue-100 rounded-lg bg-blue-50">
                      <Calendar className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium mb-1">New Booking Request</p>
                        <p className="text-sm text-gray-600">Jane Doe requested an appointment on Oct 15 at 10:30 AM</p>
                        <div className="flex gap-2 mt-2">
                          <button className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm">Approve</button>
                          <button className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm">Decline</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Feature Row 3 */}
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <LinkIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold">Seamless Integration</h3>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Google Calendar two-way sync</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Customizable booking widget for your website</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Works with any website platform (WordPress, Wix, etc.)</span>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2 p-6">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-gray-800 p-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-sm text-gray-300">embed-code.html</span>
                    </div>
                  </div>
                  <div className="bg-gray-900 p-4 font-mono text-sm">
                    <div className="text-green-400">&lt;!-- Add to your website --&gt;</div>
                    <div className="text-blue-300">&lt;script&gt;</div>
                    <div className="text-gray-300 pl-4">window.theraScheduler = &#123;</div>
                    <div className="text-gray-300 pl-8">therapistId: <span className="text-yellow-300">"t-12345"</span>,</div>
                    <div className="text-gray-300 pl-8">theme: <span className="text-yellow-300">"light"</span></div>
                    <div className="text-gray-300 pl-4">&#125;;</div>
                    <div className="text-blue-300">&lt;/script&gt;</div>
                    <div className="text-blue-300">&lt;script src=<span className="text-yellow-300">"https://therascheduler.com/embed.js"</span>&gt;&lt;/script&gt;</div>
                    <div className="text-blue-300">&lt;button data-therascheduler-button&gt;Book Now&lt;/button&gt;</div>
                  </div>
                  <div className="p-4 border-t border-gray-700">
                    <div className="bg-gray-100 p-3 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Preview:</span>
                      </div>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">Book Now</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Why Therapists Love Us</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
            Designed specifically for mental health professionals
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Save 5+ Hours Weekly</h3>
                <p className="text-gray-600">Reduce administrative work and focus more on your clients.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Reduce No-Shows by 40%</h3>
                <p className="text-gray-600">Automated reminders help clients remember their appointments.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Improve Client Experience</h3>
                <p className="text-gray-600">Provide a modern booking experience your clients will appreciate.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-2">HIPAA Compliant</h3>
                <p className="text-gray-600">Your data and your clients' information is secure and protected.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonial Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Trusted by Therapists</h2>
          
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full mb-6 flex items-center justify-center">
                <UserCog className="h-10 w-10 text-purple-600" />
              </div>
              <p className="text-lg italic text-gray-700 mb-6">
                "TheraScheduler has transformed how I manage my practice. My clients love the easy booking process, and I've reduced no-shows by 40%. The time I save on scheduling can now be spent on what matters most - helping my clients."
              </p>
              <p className="font-semibold">Dr. Sarah Johnson</p>
              <p className="text-sm text-gray-500">Clinical Psychologist</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Preview Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl mb-12 max-w-2xl mx-auto text-gray-600">
            Start for free, upgrade when you're ready
          </p>
          
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-2">Free During Beta</h3>
              <p className="text-gray-600 mb-6">Full access to all features</p>
              <div className="text-4xl font-bold mb-6">$0<span className="text-xl text-gray-500">/month</span></div>
              <ul className="space-y-3 text-left mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>Unlimited appointment bookings</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>Google Calendar integration</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>Email & SMS notifications</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>Custom booking link</span>
                </li>
              </ul>
              {!user && (
                <Button className="w-full" size="lg" asChild>
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to streamline your practice?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join therapists who are saving time and improving client satisfaction.
          </p>
          
          {!user && (
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
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
