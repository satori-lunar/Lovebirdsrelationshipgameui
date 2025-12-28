import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { Landing } from './components/Landing';
import { Onboarding } from './components/Onboarding';
import { Home } from './components/Home';
import { DailyQuestion } from './components/DailyQuestion';
import { LoveLanguageSuggestions } from './components/LoveLanguageSuggestions';
import { DatePlanning } from './components/DatePlanning';
import { GiftGuidance } from './components/GiftGuidance';
import { RelationshipTracker } from './components/RelationshipTracker';
import { Memories } from './components/Memories';
import { Settings } from './components/Settings';
import { useAuth } from './hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { onboardingService } from './services/onboardingService';

type AppState = 'landing' | 'onboarding' | 'home' | 'daily-question' | 'love-language' | 'dates' | 'gifts' | 'tracker' | 'memories' | 'settings';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppState>('landing');

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

  // Show landing if not authenticated, or if authenticated but no onboarding
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Not authenticated - show landing
        if (currentView !== 'landing' && currentView !== 'onboarding') {
          setCurrentView('landing');
        }
      } else if (user) {
        // Authenticated - check onboarding status and redirect accordingly
        // Only auto-redirect if we're on landing or onboarding page
        if (currentView === 'landing' || currentView === 'onboarding') {
          if (onboarding) {
            // User has completed onboarding - go to home
            setCurrentView('home');
          } else if (!onboardingError) {
            // User hasn't completed onboarding - show onboarding
            // Only set to onboarding if we're not already there (to avoid loops)
            if (currentView === 'landing') {
              setCurrentView('onboarding');
            }
          }
        }
      }
    }
  }, [user, onboarding, onboardingError, authLoading, currentView]);

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

  return (
    <div className="size-full bg-gradient-to-b from-pink-50 to-purple-50">
      <Toaster />
      {currentView === 'landing' && (
        <Landing onGetStarted={() => setCurrentView('onboarding')} />
      )}

      {currentView === 'onboarding' && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

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