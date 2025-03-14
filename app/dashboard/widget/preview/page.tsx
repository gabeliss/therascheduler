'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

// Add global interface for window object
declare global {
  interface Window {
    openTheraScheduler?: () => void;
    closeTheraScheduler?: () => void;
  }
}

export default function WidgetPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize parameters from URL on first render
  useEffect(() => {
    // Get therapist ID from URL using multiple methods to ensure we get it
    let urlTherapistId = searchParams.get('therapistId');
    
    // If not found in searchParams, try to get it directly from window.location
    if (!urlTherapistId && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      urlTherapistId = urlParams.get('therapistId');
      console.log('Got therapistId from window.location:', urlTherapistId);
      
      // If still not found, try to parse the hash fragment
      if (!urlTherapistId && window.location.hash) {
        console.log('Trying to parse hash fragment:', window.location.hash);
        try {
          // Remove the # character and parse as URLSearchParams
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          urlTherapistId = hashParams.get('therapistId');
          
          if (urlTherapistId) {
            console.log('Got therapistId from hash fragment:', urlTherapistId);
            
            // If we found parameters in the hash, let's restore them to the URL query string
            // This helps ensure they persist during navigation
            const allHashParams = [...hashParams.entries()].reduce((obj, [key, value]) => {
              obj[key] = value;
              return obj;
            }, {} as Record<string, string>);
            
            console.log('Restoring all parameters from hash to URL:', allHashParams);
            
            // Create a new URL with the current pathname but with parameters from the hash
            const newUrl = new URL(window.location.origin + window.location.pathname);
            Object.entries(allHashParams).forEach(([key, value]) => {
              newUrl.searchParams.set(key, value);
            });
            
            // Replace the current URL with the new one that has the parameters
            // This is a client-side only operation and won't cause a page reload
            window.history.replaceState({}, '', newUrl.toString());
            
            // Update the search params object with the new URL
            const newSearchParams = new URLSearchParams(window.location.search);
            console.log('Updated URL search params:', [...newSearchParams.entries()]);
          }
        } catch (err) {
          console.error('Error parsing URL hash:', err);
        }
      }
      
      // If still not found, try to parse the raw URL
      if (!urlTherapistId) {
        console.log('Trying to parse raw URL:', window.location.href);
        try {
          const url = new URL(window.location.href);
          urlTherapistId = url.searchParams.get('therapistId');
          console.log('Got therapistId from URL parsing:', urlTherapistId);
        } catch (err) {
          console.error('Error parsing URL:', err);
        }
      }
    }
    
    console.log('Initial URL therapistId:', urlTherapistId);
    console.log('Full URL:', typeof window !== 'undefined' ? window.location.href : 'server-side');
    
    // Set therapist ID from URL
    setTherapistId(urlTherapistId);
    setIsInitialized(true);
    
    // Debug all search params
    console.log('Preview page loaded with params:', {
      therapistId: urlTherapistId,
      primaryColor: searchParams.get('primaryColor') || (typeof window !== 'undefined' && window.location.hash ? new URLSearchParams(window.location.hash.substring(1)).get('primaryColor') : null),
      buttonText: searchParams.get('buttonText') || (typeof window !== 'undefined' && window.location.hash ? new URLSearchParams(window.location.hash.substring(1)).get('buttonText') : null),
      modalTitle: searchParams.get('modalTitle') || (typeof window !== 'undefined' && window.location.hash ? new URLSearchParams(window.location.hash.substring(1)).get('modalTitle') : null),
      width: searchParams.get('width') || (typeof window !== 'undefined' && window.location.hash ? new URLSearchParams(window.location.hash.substring(1)).get('width') : null),
      height: searchParams.get('height') || (typeof window !== 'undefined' && window.location.hash ? new URLSearchParams(window.location.hash.substring(1)).get('height') : null),
      rawUrl: typeof window !== 'undefined' ? window.location.href : 'server-side',
      rawSearch: typeof window !== 'undefined' ? window.location.search : 'server-side',
      rawHash: typeof window !== 'undefined' ? window.location.hash : 'server-side',
      allParams: typeof window !== 'undefined' ? 
        [...new URLSearchParams(window.location.search).entries()].reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as Record<string, string>) : {}
    });
  }, [searchParams]);
  
  // Handle script injection after parameters are initialized
  useEffect(() => {
    // Wait until initialization is complete
    if (!isInitialized) return;
    
    // Check if therapist ID is provided
    if (!therapistId) {
      console.error('No therapist ID found in URL parameters');
      
      // Try to extract therapistId from the URL hash if present
      // This is a fallback mechanism in case the query parameters are lost
      if (typeof window !== 'undefined' && window.location.hash) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const hashTherapistId = hashParams.get('therapistId');
          
          if (hashTherapistId) {
            console.log('Found therapistId in URL hash:', hashTherapistId);
            setTherapistId(hashTherapistId);
            return;
          }
        } catch (err) {
          console.error('Error parsing URL hash:', err);
        }
      }
      
      setError('No therapist ID provided. Please go back to the widget dashboard and try again.');
      return;
    }
    
    // Check if therapist ID is valid (not empty string)
    if (therapistId.trim() === '') {
      console.error('Empty therapist ID found in URL parameters');
      setError('Invalid therapist ID. Please go back to the widget dashboard and refresh the page.');
      return;
    }
    
    console.log('Creating embed script with therapist ID:', therapistId);
    
    // Create and inject the embed script
    const script = document.createElement('script');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Get customization options from URL params - try both methods
    const getParam = (name: string, defaultValue: string): string => {
      let value = searchParams.get(name);
      
      // If not found in searchParams, try window.location.search
      if (!value && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        value = urlParams.get(name);
        
        // If still not found, try the hash fragment
        if (!value && window.location.hash) {
          try {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            value = hashParams.get(name);
            if (value) {
              console.log(`Found ${name} in hash fragment:`, value);
            }
          } catch (err) {
            console.error(`Error parsing hash for ${name}:`, err);
          }
        }
      }
      
      return value || defaultValue;
    };
    
    const primaryColor = getParam('primaryColor', '#0f766e');
    const buttonText = getParam('buttonText', 'Book Appointment');
    const modalTitle = getParam('modalTitle', 'Book Your Appointment');
    const width = getParam('width', '900px');
    const height = getParam('height', '80vh');
    
    // Build query string
    const queryParams = new URLSearchParams({
      therapistId,
      primaryColor,
      buttonText,
      modalTitle,
      width,
      height
    }).toString();
    
    script.src = `${baseUrl}/api/embed?${queryParams}`;
    document.body.appendChild(script);
    
    // Auto-open the widget after a short delay
    const timer = setTimeout(() => {
      if (window.openTheraScheduler) {
        window.openTheraScheduler();
      }
    }, 500);
    
    // Cleanup
    return () => {
      clearTimeout(timer);
      // Remove the script when component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [therapistId, searchParams, isInitialized]);
  
  if (error) {
    return (
      <div className="container py-10">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-xl font-bold mb-4">Preview Error</h1>
            <p className="mb-6 text-muted-foreground">{error}</p>
            <Button onClick={() => window.history.back()}>
              Back to Widget Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-3xl font-bold">Widget Preview</h1>
        <p className="text-muted-foreground">
          This page demonstrates how your booking widget will appear when embedded on your website.
        </p>
        
        <div className="p-8 border rounded-lg bg-muted/20">
          <h2 className="text-xl font-semibold mb-4">Sample Website Content</h2>
          <p className="mb-6">
            This is an example of how the booking widget would appear on your website. 
            The button below will open your customized booking widget.
          </p>
          
          {/* The button will be replaced by the embed script */}
          <div data-therascheduler-booking="true" className="inline-block">
            {!isInitialized || !therapistId ? "Loading widget..." : null}
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground mt-8">
          <p>
            Note: This is just a preview. The actual widget will be embedded directly on your website.
          </p>
        </div>
      </div>
    </div>
  );
} 