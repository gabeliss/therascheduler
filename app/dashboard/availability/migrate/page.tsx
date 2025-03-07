'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function MigratePage() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const { toast } = useToast();

  const handleMigration = async () => {
    try {
      setIsMigrating(true);
      setResult(null);
      
      const response = await fetch('/api/availability/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for auth cookies
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setResult({ success: false, error: data.error || 'Migration failed' });
        throw new Error(data.error || 'Migration failed');
      }
      
      setResult({ success: true, message: data.message || 'Migration successful' });
      
      toast({
        title: "Migration successful",
        description: data.message || "Your availability data has been migrated to the new unified model.",
      });
    } catch (err) {
      console.error('Error during migration:', err);
      toast({
        title: "Migration failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Migrate Availability Data</h1>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Unified Exception Model Migration</h2>
        <p className="mb-4">
          This page allows you to migrate your existing availability exceptions to the new unified model.
          The unified model simplifies the way exceptions are stored and makes it easier to manage your availability.
        </p>
        <p className="mb-6">
          Click the button below to start the migration process. This will convert all your existing exceptions
          to the new unified format.
        </p>
        
        {result && (
          <Alert variant={result.success ? "default" : "destructive"} className="mb-6">
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>
              {result.success ? result.message : result.error}
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handleMigration} 
          disabled={isMigrating}
          size="lg"
        >
          {isMigrating ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Migrating...
            </>
          ) : (
            'Start Migration'
          )}
        </Button>
      </div>
    </div>
  );
} 