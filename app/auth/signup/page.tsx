'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useAuth } from '@/app/context/auth-context';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const router = useRouter();
  
  // Therapist signup form state
  const [therapistForm, setTherapistForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const handleTherapistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTherapistForm({
      ...therapistForm,
      [e.target.name]: e.target.value,
    });
  };
  
  const handleTherapistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (therapistForm.password !== therapistForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setIsLoading(true);
      await signUp(therapistForm.email, therapistForm.password, therapistForm.name);
      router.push('/auth/verification');
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center py-12">
      <div className="w-full max-w-[450px] px-4">
        <div className="flex flex-col space-y-2 text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign up to start managing your therapy practice
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Enter your information to create an account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleTherapistSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="therapist-name">Name</Label>
                <Input 
                  id="therapist-name" 
                  name="name" 
                  placeholder="Your name" 
                  required 
                  value={therapistForm.name}
                  onChange={handleTherapistChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="therapist-email">Email</Label>
                <Input 
                  id="therapist-email" 
                  name="email" 
                  type="email" 
                  placeholder="your.email@example.com" 
                  required 
                  value={therapistForm.email}
                  onChange={handleTherapistChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="therapist-password">Password</Label>
                <Input 
                  id="therapist-password" 
                  name="password" 
                  type="password" 
                  required 
                  value={therapistForm.password}
                  onChange={handleTherapistChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="therapist-confirm-password">Confirm Password</Label>
                <Input 
                  id="therapist-confirm-password" 
                  name="confirmPassword" 
                  type="password" 
                  required 
                  value={therapistForm.confirmPassword}
                  onChange={handleTherapistChange}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>
            <CardFooter className="pt-6">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center text-sm mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
} 