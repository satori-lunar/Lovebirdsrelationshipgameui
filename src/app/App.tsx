import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { EntryChoice } from './components/EntryChoice';
import { FeatureSlides } from './components/FeatureSlides';
import { SignUp } from './components/SignUp';
import { Onboarding } from './components/Onboarding';
import { Home } from './components/Home';
import { DailyQuestion } from './components/DailyQuestion';
import { LoveLanguageSuggestions } from './components/LoveLanguageSuggestions';
import { DatePlanning } from './components/DatePlanning';
import { GiftGuidance } from './components/GiftGuidance';
import { RelationshipTracker } from './components/RelationshipTracker';
import { Memories } from './components/Memories';
import { Settings } from './components/Settings';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { onboardingService } from './services/onboardingService';

type AppState = 'entry' | 'feature-slides' | 'sign-up' | 'sign-in' | 'onboarding' | 'home' | 'daily-question' | 'love-language' | 'dates' | 'gifts' | 'tracker' | 'memories' | 'settings';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppState>('entry');
  const [showSignInModal, setShowSignInModal] = useState(false);

  const { data: onboarding, error: onboardingError } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const userData = onboarding ? {
    name: onboarding.name,
    partnerName: onboarding.partner_name,
  } : null;

  const handleOnboardingComplete = () => {
    setCurrentView('home');
  };

  const handleNavigate = (page: string) => {
    setCurrentView(page as AppState);
  };

  const handleBack = () => {
    setCurrentView('home');
  };

  // Handle routing based on auth and onboarding status
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // If not authenticated and not in entry flow, show entry
    if (!user) {
      if (!['entry', 'feature-slides', 'sign-up', 'sign-in'].includes(currentView)) {
        setCurrentView('entry');
      }
      return;
    }

    // User is authenticated - check onboarding status
    // Only auto-redirect if we're on the sign-up screen (after successful sign up)
    // Don't redirect if user is on entry or feature-slides (let them complete the flow)
    if (currentView === 'sign-up') {
      // After sign up, wait a moment then redirect to onboarding
      const redirectTimer = setTimeout(() => {
        if (onboarding === null) {
          setCurrentView('onboarding');
        } else if (onboarding) {
          setCurrentView('home');
        }
      }, 1500); // Give time to see success message
      
      return () => clearTimeout(redirectTimer);
    }
    
    // If user is authenticated and on entry (cached session), redirect based on onboarding
    // But don't redirect from feature-slides - let them complete the flow
    if (currentView === 'entry') {
      if (onboarding === null) {
        setCurrentView('onboarding');
      } else if (onboarding) {
        setCurrentView('home');
      }
    }
  }, [user, onboarding, authLoading, currentView]);

  if (authLoading) {
    return (
      <div className="size-full bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSignInSuccess = () => {
    setShowSignInModal(false);
    // Check onboarding status and redirect
    if (onboarding === null) {
      setCurrentView('onboarding');
    } else if (onboarding) {
      setCurrentView('home');
    }
  };

  return (
    <div className="size-full bg-gradient-to-b from-pink-50 to-purple-50">
      <Toaster />
      
      {currentView === 'entry' && (
        <EntryChoice
          onSignIn={() => setShowSignInModal(true)}
          onFirstTime={() => setCurrentView('feature-slides')}
        />
      )}

      {currentView === 'feature-slides' && (
        <FeatureSlides
          onComplete={() => setCurrentView('sign-up')}
          onBack={() => setCurrentView('entry')}
        />
      )}

      {currentView === 'sign-up' && (
        <SignUp
          onSuccess={() => {
            // After successful sign up, redirect handled by useEffect
          }}
          onBack={() => setCurrentView('feature-slides')}
        />
      )}

      {currentView === 'onboarding' && user && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      <AuthModal
        open={showSignInModal}
        onOpenChange={setShowSignInModal}
        onSuccess={handleSignInSuccess}
        signInOnly={true}
      />

      {currentView === 'home' && (
        <Home 
          userName={userData?.name || 'there'}
          partnerName={userData?.partnerName || 'your partner'}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'daily-question' && (
        <DailyQuestion onComplete={handleBack} />
      )}

      {currentView === 'love-language' && userData && (
        <LoveLanguageSuggestions 
          onBack={handleBack}
          partnerName={userData.partnerName || 'your partner'}
        />
      )}

      {currentView === 'dates' && userData && (
        <DatePlanning
          onBack={handleBack}
          partnerName={userData.partnerName || 'your partner'}
        />
      )}

      {currentView === 'gifts' && userData && (
        <GiftGuidance
          onBack={handleBack}
          partnerName={userData.partnerName || 'your partner'}
        />
      )}

      {currentView === 'tracker' && userData && (
        <RelationshipTracker
          onBack={handleBack}
          partnerName={userData.partnerName || 'your partner'}
        />
      )}

      {currentView === 'memories' && (
        <Memories onBack={handleBack} />
      )}

      {currentView === 'settings' && (
        <Settings 
          onBack={handleBack}
          partnerName={userData?.partnerName || 'your partner'}
        />
      )}
    </div>
  );
}