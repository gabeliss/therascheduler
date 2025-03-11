'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function VerificationPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Try to get the email from localStorage or session storage if available
    const emailFromStorage = localStorage.getItem('verificationEmail');
    if (emailFromStorage) {
      setEmail(emailFromStorage);
    }

    // Check if user is already signed in and verified
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !session.user.email_confirmed_at) {
        // User is signed in but email not confirmed
        setEmail(session.user.email || null);
      } else if (session?.user && session.user.email_confirmed_at) {
        // User is signed in and email is confirmed, redirect to dashboard
        router.push('/dashboard');
      }
    };

    checkAuth();
  }, [router, supabase.auth]);

  const handleResendEmail = async () => {
    if (!email) return;
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        console.error('Error resending verification email:', error);
        alert('Failed to resend verification email. Please try again.');
      } else {
        alert('Verification email resent! Please check your inbox.');
      }
    } catch (err) {
      console.error('Exception resending verification email:', err);
      alert('An error occurred. Please try again later.');
    }
  };

  const handleBackToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
        
        <p className="mb-4">
          We&apos;ve sent a verification link to {email ? <span className="font-medium">{email}</span> : 'your email address'}.
          Please check your inbox and click the link to verify your account.
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          If you don&apos;t see the email, check your spam folder.
        </p>
        
        <div className="space-y-4">
          <Button 
            onClick={handleResendEmail} 
            variant="outline" 
            className="w-full"
            disabled={!email}
          >
            Resend Verification Email
          </Button>
          
          <Button 
            onClick={handleBackToLogin} 
            variant="secondary" 
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
} 