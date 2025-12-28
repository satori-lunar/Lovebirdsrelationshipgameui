import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App.tsx";
import { AuthProvider } from "./app/contexts/AuthContext";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Check if root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Log environment variables (for debugging - safe to expose)
const envCheck = {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  nodeEnv: import.meta.env.MODE,
  supabaseUrlPreview: import.meta.env.VITE_SUPABASE_URL?.substring(0, 40) || 'NOT SET',
  supabaseKeyPreview: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 30) || 'NOT SET',
};

console.log("🔍 Environment Check:", envCheck);

if (!envCheck.hasSupabaseUrl || !envCheck.hasSupabaseKey) {
  console.error('❌ CRITICAL: Supabase environment variables are missing!');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
  