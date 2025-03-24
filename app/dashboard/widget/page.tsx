'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Copy, ExternalLink, Check, Settings, Calendar, Code, Loader2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '@/app/context/auth-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/utils/supabase';

export default function WidgetPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [therapistId, setTherapistId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [customization, setCustomization] = useState({
    primaryColor: '#0f766e',
    buttonText: 'Book Appointment',
    modalTitle: 'Book Your Appointment',
    width: '900px',
    height: '80vh'
  });

  // Fetch therapist ID on load
  useEffect(() => {
    async function fetchTherapistId() {
      console.log('fetchTherapistId');
      console.log('user', user);
      if (!user) return;
      
      try {
        console.log('Fetching therapist profile for user ID:', user.id);
        
        // Add debugging for auth state
        const { data: authData } = await supabase.auth.getSession();
        console.log('Current auth session:', authData.session ? 'Authenticated' : 'Not authenticated');
        console.log('Auth user ID:', authData.session?.user?.id);
        console.log('Does auth ID match context user ID:', authData.session?.user?.id === user.id);
        
        // First, let's check if the user ID exists in the therapists table
        const { data: checkData, error: checkError } = await supabase
          .from('therapists')
          .select('*')
          .eq('user_id', user.id);
          
        console.log('Check result:', checkData, checkError);
        
        // Now try to get the actual profile
        const { data: therapistProfile, error } = await supabase
          .from('therapists')
          .select('id, user_id')
          .eq('user_id', user.id)
          .single();
          
        console.log('Query result:', therapistProfile, error);
        
        if (error) {
          // If the error is that no rows were found, we'll try a different approach
          if (error.code === 'PGRST116') {
            console.log('No rows found with single(), trying without single()');
            
            // Try without single() to see if we get any results
            const { data: allProfiles, error: listError } = await supabase
              .from('therapists')
              .select('id, user_id')
              .eq('user_id', user.id);
              
            console.log('All profiles result:', allProfiles, listError);
            
            if (allProfiles && allProfiles.length > 0) {
              console.log('Found profile(s) without single():', allProfiles);
              setTherapistId(allProfiles[0].id);
              return;
            }
          }
          
          throw error;
        }
        
        if (therapistProfile) {
          console.log('Found therapist profile:', therapistProfile);
          setTherapistId(therapistProfile.id);
        } else {
          console.log('No therapist profile found despite no error');
        }
      } catch (err) {
        console.error('Error fetching therapist ID:', err);
        toast({
          title: 'Error',
          description: 'Failed to load your therapist profile. Please refresh the page.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchTherapistId();
    } else {
      setLoading(false);
    }
  }, [supabase, toast, user]);

  // Generate embed code
  const generateEmbedCode = () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const queryParams = new URLSearchParams({
      therapistId,
      primaryColor: customization.primaryColor,
      buttonText: customization.buttonText,
      modalTitle: customization.modalTitle,
      width: customization.width,
      height: customization.height
    }).toString();

    return `<script src="${baseUrl}/api/embed?${queryParams}"></script>
<div data-therascheduler-booking="true"></div>`;
  };

  // Handle copy to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    setCopied(true);
    toast({
      title: 'Copied to clipboard',
      description: 'The embed code has been copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle customization change
  const handleCustomizationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomization(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Preview URL
  const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/widget-preview?${new URLSearchParams({
    therapistId,
    primaryColor: customization.primaryColor,
    buttonText: customization.buttonText,
    modalTitle: customization.modalTitle,
    width: customization.width,
    height: customization.height
  }).toString()}`;
  
  // Add debug logging for preview URL
  console.log('Preview URL therapistId:', therapistId);
  console.log('Full preview URL:', previewUrl);

  if (loading) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Booking Widget</h1>
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading your widget settings...</span>
        </div>
      </div>
    );
  }

  if (!therapistId) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Booking Widget</h1>
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-red-600">Therapist Profile Not Found</h2>
              <p>We couldn't find your therapist profile. This could be because:</p>
              <ul className="text-left list-disc pl-8 space-y-1">
                <li>Your account is not fully set up</li>
                <li>Your therapist profile hasn't been created yet</li>
                <li>There's an issue with your account linking</li>
              </ul>
              <div className="pt-4 flex flex-col gap-2">
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Booking Widget</h1>
      
      <Tabs defaultValue="embed">
        <TabsList className="mb-4">
          <TabsTrigger value="embed">
            <Code className="h-4 w-4 mr-2" />
            Embed Code
          </TabsTrigger>
          <TabsTrigger value="customize">
            <Settings className="h-4 w-4 mr-2" />
            Customize
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Calendar className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="embed">
          <Card>
            <CardHeader>
              <CardTitle>Embed on Your Website</CardTitle>
              <CardDescription>
                Copy this code and paste it into your website where you want the booking button to appear.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <SyntaxHighlighter
                    language="html"
                    style={tomorrow}
                    customStyle={{
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    {generateEmbedCode()}
                  </SyntaxHighlighter>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2">How to use:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Copy the code above.</li>
                    <li>Paste it into your website's HTML where you want the booking button to appear.</li>
                    <li>The button will automatically appear and open the booking widget when clicked.</li>
                    <li>You can also create your own button by adding the <code className="bg-muted-foreground/20 px-1 rounded">data-therascheduler-booking="true"</code> attribute to any element.</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="customize">
          <Card>
            <CardHeader>
              <CardTitle>Customize Your Widget</CardTitle>
              <CardDescription>
                Adjust the appearance of your booking widget to match your website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        name="primaryColor"
                        type="color"
                        value={customization.primaryColor}
                        onChange={handleCustomizationChange}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        type="text"
                        value={customization.primaryColor}
                        onChange={handleCustomizationChange}
                        name="primaryColor"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="buttonText">Button Text</Label>
                    <Input
                      id="buttonText"
                      name="buttonText"
                      value={customization.buttonText}
                      onChange={handleCustomizationChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="modalTitle">Modal Title</Label>
                    <Input
                      id="modalTitle"
                      name="modalTitle"
                      value={customization.modalTitle}
                      onChange={handleCustomizationChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">Widget Width</Label>
                    <Input
                      id="width"
                      name="width"
                      value={customization.width}
                      onChange={handleCustomizationChange}
                      placeholder="e.g., 900px or 90%"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="height">Widget Height</Label>
                    <Input
                      id="height"
                      name="height"
                      value={customization.height}
                      onChange={handleCustomizationChange}
                      placeholder="e.g., 80vh or 600px"
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      className="w-full"
                      style={{ backgroundColor: customization.primaryColor }}
                    >
                      {customization.buttonText}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Preview of your button style
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Preview Your Widget</CardTitle>
              <CardDescription>
                See how your booking widget will appear to clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border rounded-md p-4 bg-muted/30">
                  <div className="bg-white rounded-md border overflow-hidden">
                    <div className="h-[500px] w-full">
                      {therapistId ? (
                        <iframe 
                          src={previewUrl}
                          className="w-full h-full"
                          title="Widget Preview"
                          frameBorder="0"
                        />
                      ) : (
                        <div className="flex justify-center items-center h-full">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="ml-2">Loading preview...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!therapistId && (
                    <p className="text-sm text-red-500 mt-2 text-center">
                      Therapist profile not loaded. Please refresh the page.
                    </p>
                  )}
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2">Testing your widget:</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>The preview above shows how your widget will appear to clients.</li>
                    <li>You can test the full booking flow, including form submission.</li>
                    <li>Test appointments will appear in your dashboard for approval.</li>
                    <li>Make sure to test on different devices to ensure responsiveness.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 