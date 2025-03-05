'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  
  // Client signup form state
  const [clientForm, setClientForm] = useState({
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
  
  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientForm({
      ...clientForm,
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
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (clientForm.password !== clientForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setIsLoading(true);
      // TODO: Implement client signup
      alert('Client signup will be implemented in the next phase');
      router.push('/auth/verification');
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose your account type below
          </p>
        </div>

        <Tabs defaultValue="client" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client">Client</TabsTrigger>
            <TabsTrigger value="therapist">Therapist</TabsTrigger>
          </TabsList>
          
          <TabsContent value="client">
            <Card>
              <CardHeader>
                <CardTitle>Client Account</CardTitle>
                <CardDescription>
                  Create an account to book appointments with therapists
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleClientSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Name</Label>
                    <Input 
                      id="client-name" 
                      name="name" 
                      placeholder="Your name" 
                      required 
                      value={clientForm.name}
                      onChange={handleClientChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-email">Email</Label>
                    <Input 
                      id="client-email" 
                      name="email" 
                      type="email" 
                      placeholder="your.email@example.com" 
                      required 
                      value={clientForm.email}
                      onChange={handleClientChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password">Password</Label>
                    <Input 
                      id="client-password" 
                      name="password" 
                      type="password" 
                      required 
                      value={clientForm.password}
                      onChange={handleClientChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-confirm-password">Confirm Password</Label>
                    <Input 
                      id="client-confirm-password" 
                      name="confirmPassword" 
                      type="password" 
                      required 
                      value={clientForm.confirmPassword}
                      onChange={handleClientChange}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create client account'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="therapist">
            <Card>
              <CardHeader>
                <CardTitle>Therapist Account</CardTitle>
                <CardDescription>
                  Create an account to manage your therapy practice
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
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create therapist account'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/auth/login" className="underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
} 