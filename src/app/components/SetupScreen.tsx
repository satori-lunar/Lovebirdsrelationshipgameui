import { Heart, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { isSupabaseConfigured } from '../lib/supabase';

export function SetupScreen() {
  const isConfigured = isSupabaseConfigured();

  if (isConfigured) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Setup Required</h1>
          <p className="text-gray-600">
            Please configure your Supabase environment variables to get started
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-purple-600" />
              Quick Setup Guide
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
              <li>
                Create a free Supabase project at{' '}
                <a 
                  href="https://supabase.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline inline-flex items-center gap-1"
                >
                  supabase.com
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Run the SQL migrations from <code className="bg-white px-2 py-1 rounded">supabase/migrations/</code> in your Supabase SQL Editor</li>
              <li>Create a storage bucket named <code className="bg-white px-2 py-1 rounded">memories</code> for photo uploads</li>
              <li>Get your project URL and anon key from Settings → API</li>
              <li>Create a <code className="bg-white px-2 py-1 rounded">.env</code> file in the project root with:
                <pre className="bg-white p-3 rounded mt-2 text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}
                </pre>
              </li>
              <li>Restart your development server</li>
            </ol>
          </div>

          <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Example .env file:</h3>
            <pre className="bg-white p-4 rounded text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}
            </pre>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              Check Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('https://supabase.com/docs/guides/getting-started', '_blank')}
              className="flex-1"
            >
              View Supabase Docs
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

