'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/app/context/auth-context';
import { Loader2, Copy, Check, ExternalLink, Code } from 'lucide-react';
import { supabase } from '@/app/utils/supabase';

export default function EmbedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  
  useEffect(() => {
    async function fetchTherapistId() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('therapists')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (error) throw error;
        if (data) {
          setTherapistId(data.id);
          setPreviewUrl(`${window.location.origin}/book?therapist=${data.id}`);
        }
      } catch (err) {
        console.error('Error fetching therapist ID:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTherapistId();
  }, [user]);
  
  const handleCopyButtonCode = () => {
    if (!therapistId) return;
    
    const buttonCode = `<button data-therascheduler-booking>Book an Appointment</button>`;
    const scriptCode = `<script src="${window.location.origin}/api/embed?therapistId=${therapistId}"></script>`;
    
    navigator.clipboard.writeText(`${buttonCode}\n\n${scriptCode}`);
    setCopied(true);
    toast({
      title: 'Copied to clipboard!',
      description: 'The embed code has been copied to your clipboard.',
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopyInlineCode = () => {
    if (!therapistId) return;
    
    const inlineCode = `<a href="#" onclick="openTheraScheduler(); return false;">Book an Appointment</a>\n<script src="${window.location.origin}/api/embed?therapistId=${therapistId}"></script>`;
    
    navigator.clipboard.writeText(inlineCode);
    setCopied(true);
    toast({
      title: 'Copied to clipboard!',
      description: 'The inline code has been copied to your clipboard.',
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Embed Booking Widget</h1>
      <p className="text-gray-600 mb-8">
        Add the booking widget to your website so clients can schedule appointments directly.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="button">
            <TabsList className="mb-4">
              <TabsTrigger value="button">Button Code</TabsTrigger>
              <TabsTrigger value="inline">Inline Link</TabsTrigger>
            </TabsList>
            
            <TabsContent value="button">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code size={18} /> Button Embed Code
                  </CardTitle>
                  <CardDescription>
                    Add this code to your website to display a "Book an Appointment" button.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
                      {`<!-- Add this where you want the booking button to appear -->\n<button data-therascheduler-booking>Book an Appointment</button>\n\n<!-- Add this script before the closing </body> tag -->\n<script src="${window.location.origin}/api/embed?therapistId=${therapistId}"></script>`}
                    </pre>
                  </div>
                  
                  <Button 
                    onClick={handleCopyButtonCode} 
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" /> Copy Code
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="inline">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code size={18} /> Inline Link Code
                  </CardTitle>
                  <CardDescription>
                    Add this code if you want to use your own link or button styling.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
                      {`<!-- Add this where you want the booking link to appear -->\n<a href="#" onclick="openTheraScheduler(); return false;">Book an Appointment</a>\n\n<!-- Add this script before the closing </body> tag -->\n<script src="${window.location.origin}/api/embed?therapistId=${therapistId}"></script>`}
                    </pre>
                  </div>
                  
                  <Button 
                    onClick={handleCopyInlineCode} 
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" /> Copy Code
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Installation Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">1. Copy the code</h3>
                  <p className="text-gray-600">Select the embed code option that works best for your website and copy it.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">2. Add to your website</h3>
                  <p className="text-gray-600">Paste the button/link code where you want the booking button to appear on your website.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">3. Add the script</h3>
                  <p className="text-gray-600">Paste the script tag just before the closing <code>&lt;/body&gt;</code> tag of your website.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">4. Test it out</h3>
                  <p className="text-gray-600">Visit your website and click the booking button to make sure it works correctly.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Preview & Test</CardTitle>
              <CardDescription>
                See how your booking widget will look and test it before adding to your site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> 
                  Preview Full Page
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Test the embed widget:</p>
                  <Button 
                    variant="outline" 
                    data-therascheduler-booking
                  >
                    Book an Appointment
                  </Button>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-2">Direct Booking Link</h3>
                <p className="text-xs text-gray-500 mb-2">
                  You can also share this direct link with clients:
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">
                  {previewUrl}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(previewUrl);
                    toast({
                      title: 'Link copied!',
                      description: 'The booking link has been copied to your clipboard.',
                    });
                  }}
                >
                  <Copy className="mr-2 h-3 w-3" /> Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 