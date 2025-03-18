'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/supabase';
import { useAuth } from '@/app/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { CopyIcon, CheckIcon } from 'lucide-react';

export default function WidgetCodePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [therapistProfile, setTherapistProfile] = useState<{ id: string } | null>(null);
  const [customization, setCustomization] = useState({
    primaryColor: '#0f766e',
    buttonText: 'Book Appointment',
    modalTitle: 'Book Your Appointment',
    width: '900px',
    height: '80vh'
  });

  // Fetch therapist ID on load
  useEffect(() => {
    async function fetchTherapistProfile() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('therapist_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        setTherapistProfile(data);
      } catch (err) {
        console.error('Error fetching therapist profile:', err);
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
      fetchTherapistProfile();
    } else {
      setLoading(false);
    }
  }, [user, toast]);

  // Generate embed code based on our new widget-preview API endpoint
  const scriptCode = `<script>
  (function() {
    // Therascheduler widget initialization
    var therapistId = "${therapistProfile?.id || "YOUR_THERAPIST_ID"}";
    var primaryColor = "${customization.primaryColor}";
    var buttonText = "${customization.buttonText}";
    var modalTitle = "${customization.modalTitle}";
    
    // Create button element
    var button = document.createElement("button");
    button.innerHTML = buttonText;
    button.style.backgroundColor = primaryColor;
    button.style.color = "white";
    button.style.border = "none";
    button.style.padding = "10px 20px";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.fontFamily = "system-ui, sans-serif";
    button.style.fontWeight = "500";
    
    // Create modal elements
    var modal = document.createElement("div");
    var modalOverlay = document.createElement("div");
    var modalContent = document.createElement("div");
    var closeButton = document.createElement("button");
    var iframe = document.createElement("iframe");
    
    // Set up modal
    modal.style.display = "none";
    modal.style.position = "fixed";
    modal.style.zIndex = "9999";
    modal.style.left = "0";
    modal.style.top = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.overflow = "auto";
    modal.style.fontFamily = "system-ui, sans-serif";
    
    // Set up overlay
    modalOverlay.style.position = "fixed";
    modalOverlay.style.width = "100%";
    modalOverlay.style.height = "100%";
    modalOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    
    // Set up modal content
    modalContent.style.backgroundColor = "#fefefe";
    modalContent.style.margin = "10% auto";
    modalContent.style.padding = "20px";
    modalContent.style.border = "1px solid #888";
    modalContent.style.width = "${customization.width}";
    modalContent.style.maxWidth = "95%";
    modalContent.style.borderRadius = "8px";
    modalContent.style.position = "relative";
    
    // Set up close button
    closeButton.innerHTML = "×";
    closeButton.style.color = "#aaa";
    closeButton.style.float = "right";
    closeButton.style.fontSize = "28px";
    closeButton.style.fontWeight = "bold";
    closeButton.style.border = "none";
    closeButton.style.background = "none";
    closeButton.style.cursor = "pointer";
    closeButton.style.position = "absolute";
    closeButton.style.right = "10px";
    closeButton.style.top = "5px";
    
    // Set up iframe
    iframe.style.width = "100%";
    iframe.style.height = "${customization.height}";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    
    // Set iframe source to our API endpoint
    var baseUrl = "${process.env.NEXT_PUBLIC_APP_URL || "https://therascheduler.vercel.app"}";
    iframe.src = baseUrl + "/api/widget-preview?" + new URLSearchParams({
      therapistId: therapistId,
      primaryColor: primaryColor,
      buttonText: buttonText,
      modalTitle: modalTitle
    }).toString();
    
    // Assemble modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(document.createElement("h2")).textContent = modalTitle;
    modalContent.appendChild(iframe);
    modal.appendChild(modalOverlay);
    modal.appendChild(modalContent);
    
    // Add event listeners
    button.addEventListener("click", function() {
      modal.style.display = "block";
      document.body.style.overflow = "hidden";
    });
    
    closeButton.addEventListener("click", function() {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    });
    
    modalOverlay.addEventListener("click", function() {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    });
    
    // Add elements to document
    document.currentScript.parentNode.appendChild(button);
    document.body.appendChild(modal);
  })();
</script>`;

  // Handle copy to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    toast({
      title: 'Copied to clipboard',
      description: 'The embed code has been copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Embed Code</h1>
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading your embed code...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Embed Code</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Booking Widget Code</CardTitle>
          <CardDescription>
            Copy this code and paste it into your website where you want the booking button to appear.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <SyntaxHighlighter
              language="javascript"
              style={atomOneDark}
              className="rounded-md !bg-slate-950 p-4 text-sm"
            >
              {scriptCode}
            </SyntaxHighlighter>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 h-8 gap-1"
              onClick={handleCopyCode}
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 