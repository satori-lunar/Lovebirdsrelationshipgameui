import { useState, useEffect, useCallback } from 'react';
import { Toaster } from './components/ui/sonner';
import { EntryChoice } from './components/EntryChoice';
import { FeatureSlides } from './components/FeatureSlides';
import { SignUp } from './components/SignUp';
import { Onboarding } from './components/Onboarding';
import { Home } from './components/Home';
import { DailyQuestion } from './components/DailyQuestion';
import { LoveLanguageSuggestions } from './components/LoveLanguageSuggestions';
import { DatePlanning } from './components/DatePlanning';
import { DatePlanner } from './components/DatePlanner';
import { DateChallenge } from './components/DateChallenge';
import { DatesWrapper } from './components/DatesWrapper';
import { GiftGuidance } from './components/GiftGuidance';
import { LoveNudges } from './components/LoveNudges';
import { SurpriseVault } from './components/SurpriseVault';
import { LoveMessages } from './components/LoveMessages';
import { PartnerRequests } from './components/PartnerRequests';
import { WeeklyWishes } from './components/WeeklyWishes';
import { RelationshipTracker } from './components/RelationshipTracker';
import { Memories } from './components/Memories';
import { Settings } from './components/Settings';
import { PartnerInsights } from './components/PartnerInsights';
import { DragonPet } from './components/DragonPet';
import { DragonEvolutionDemo } from './components/DragonEvolutionDemo';
import { WidgetGallery } from './components/WidgetGallery';
import { SendWidgetGift } from './components/SendWidgetGift';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './hooks/useAuth';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useQuery } from '@tanstack/react-query';
import { onboardingService } from './services/onboardingService';
import { widgetGiftService } from './services/widgetGiftService';
import type { PushNotificationData } from './services/pushNotificationService';

type AppState = 'entry' | 'feature-slides' | 'sign-up' | 'sign-in' | 'onboarding' | 'home' | 'daily-question' | 'love-language' | 'dates' | 'gifts' | 'nudges' | 'vault' | 'messages' | 'requests' | 'weekly-wishes' | 'tracker' | 'memories' | 'widget-gallery' | 'send-widget-gift' | 'settings' | 'insights' | 'dragon' | 'dragon-demo';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppState>('entry');
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Handle push notification taps
  const handleNotificationTap = useCallback((data: PushNotificationData) => {
    if (data.type === 'widget_gift') {
      // Sync gifts and navigate to home to see the gift
      widgetGiftService.syncGiftsToWidget();
      setCurrentView('home');
    }
  }, []);

  // Initialize push notifications
  usePushNotifications({
    onNotificationTap: handleNotificationTap,
  });

  const { data: onboarding, error: onboardingError } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user && !!user.id && currentView !== 'sign-up' && currentView !== 'sign-in',
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

    // User is authenticated
    // Only auto-redirect if user has COMPLETED onboarding (not in progress)
    if (currentView === 'entry') {
      // If onboarding is completed, go to home
      if (onboarding) {
        setCurrentView('home');
      }
      // If onboarding is null/incomplete, stay on entry - let them choose sign in
      // This handles cached sessions from incomplete sign-ups
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
            // After successful sign up, redirect to onboarding
            // New users always need to complete onboarding
            // Wait a moment to show success message and ensure auth state is ready
            setTimeout(() => {
              setCurrentView('onboarding');
            }, 2000); // Increased delay to ensure auth state is established
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
        <DailyQuestion
          onComplete={handleBack}
          partnerName={userData?.partnerName || 'your partner'}
        />
      )}

      {currentView === 'love-language' && userData && (
        <LoveLanguageSuggestions 
          onBack={handleBack}
          partnerName={userData.partnerName || 'your partner'}
        />
      )}

      {currentView === 'dates' && userData && (
        <DatesWrapper
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

      {currentView === 'nudges' && userData && (
        <LoveNudges
          onBack={handleBack}
          onNavigate={handleNavigate}
          partnerName={userData.partnerName || 'your partner'}
        />
      )}

      {currentView === 'vault' && userData && (
        <SurpriseVault
          onBack={handleBack}
          partnerName={userData.partnerName || 'your partner'}
        />
      )}

      {currentView === 'messages' && (
        <LoveMessages onBack={handleBack} />
      )}

      {currentView === 'requests' && (
        <PartnerRequests onBack={handleBack} />
      )}

      {currentView === 'weekly-wishes' && userData && (
        <WeeklyWishes
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

      {currentView === 'widget-gallery' && (
        <WidgetGallery onBack={handleBack} />
      )}

      {currentView === 'send-widget-gift' && (
        <SendWidgetGift onBack={handleBack} />
      )}

      {currentView === 'insights' && userData && (
        <PartnerInsights
          partnerName={userData.partnerName || 'your partner'}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'dragon' && (
        <DragonPet onBack={handleBack} />
      )}

      {currentView === 'dragon-demo' && (
        <DragonEvolutionDemo onBack={handleBack} />
      )}

      {currentView === 'settings' && (
        <Settings
          onBack={handleBack}
          partnerName={userData?.partnerName || 'your partner'}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}