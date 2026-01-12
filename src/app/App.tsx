import { useState, useEffect, useCallback } from 'react';
import { Toaster } from './components/ui/sonner';
import { EntryChoice } from './components/EntryChoice';
import { FeatureSlides } from './components/FeatureSlides';
import { SignUp } from './components/SignUp';
import { Onboarding } from './components/Onboarding';
import { Home } from './components/Home';
import { DailyQuestion } from './components/DailyQuestion';
import { LoveLanguageSuggestions } from './components/LoveLanguageSuggestions';
import { LoveLanguageQuiz } from './components/LoveLanguageQuiz';
import { DatePlanning } from './components/DatePlanning';
import { DatePlanner } from './components/DatePlanner';
import { DateChallenge } from './components/DateChallenge';
import { DatesWrapper } from './components/DatesWrapper';
import { GiftGuidance } from './components/GiftGuidance';
import { LoveMessages } from './components/LoveMessages';
import { PartnerRequests } from './components/PartnerRequests';
import { WeeklyWishes } from './components/WeeklyWishes';
import { RelationshipTracker } from './components/RelationshipTracker';
import { Memories } from './components/Memories';
import { Settings } from './components/Settings';
import { DragonPet } from './components/DragonPet';
import { DragonEvolutionDemo } from './components/DragonEvolutionDemo';
import { ThingsToRemember } from './components/ThingsToRemember';
import { CreateLockscreenGift } from './components/CreateLockscreenGift';
import { ViewLockscreenGift } from './components/ViewLockscreenGift';
import { WeeklySuggestions } from './components/WeeklySuggestions';
import { AuthModal } from './components/AuthModal';
import RelationshipModeSetup from './components/RelationshipModeSetup';
import SoloModeSetup from './components/SoloModeSetup';
import PartnerInsightsForm from './components/PartnerInsightsForm';
import CapacityCheckIn from './components/CapacityCheckIn';
import { PartnerProfileOnboarding } from './components/PartnerProfileOnboarding';
import { NeedSupportPlan } from './components/NeedSupportPlan';
import { CouplesChallenges } from './components/CouplesChallenges';
import { SomethingFeelsMissing } from './components/SomethingFeelsMissing';
import { Icebreakers } from './components/Icebreakers';
import { useAuth } from './hooks/useAuth';
import { useRelationship } from './hooks/useRelationship';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useWidgetRefresh, useWidgetGiftSync } from './hooks/useWidgetRefresh';
import { useQuery } from '@tanstack/react-query';
import { onboardingService } from './services/onboardingService';
import { widgetGiftService } from './services/widgetGiftService';
import { api } from './services/api';
import type { PushNotificationData } from './services/pushNotificationService';

type AppState = 'entry' | 'feature-slides' | 'sign-up' | 'sign-in' | 'onboarding' | 'profile-onboarding' | 'relationship-mode-setup' | 'solo-mode-setup' | 'partner-insights-form' | 'home' | 'daily-question' | 'love-language' | 'love-language-quiz' | 'weekly-suggestions' | 'dates' | 'gifts' | 'messages' | 'requests' | 'weekly-wishes' | 'tracker' | 'memories' | 'create-lockscreen-gift' | 'view-lockscreen-gift' | 'settings' | 'dragon' | 'dragon-demo' | 'capacity-checkin' | 'things-to-remember' | 'need-support-plan' | 'couples-challenges' | 'icebreakers' | 'something-feels-missing';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppState>('entry');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [supportPlanNeed, setSupportPlanNeed] = useState<any>(null);

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

  // Automatically refresh widget when app goes to background
  useWidgetRefresh();

  // Sync widget gifts when app becomes active
  useWidgetGiftSync(user?.id || null);

  const { data: onboarding, error: onboardingError, refetch: refetchOnboarding } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user && !!user.id && currentView !== 'sign-up' && currentView !== 'sign-in',
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Get relationship to find partner's user ID
  const { relationship } = useRelationship();

  // Get partner's user ID from relationship
  const partnerId = relationship && user ? (
    relationship.partner_a_id === user.id ? relationship.partner_b_id : relationship.partner_a_id
  ) : null;

  // Fetch partner's onboarding data to get their actual name
  const { data: partnerOnboarding, isLoading: isLoadingPartner, error: partnerError } = useQuery({
    queryKey: ['partner-onboarding', partnerId],
    queryFn: () => onboardingService.getOnboarding(partnerId!),
    enabled: !!partnerId,
    retry: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to get latest data
  });

  // Fallback: Fetch partner's name from users table if onboarding is null
  const { data: partnerNameFromUsers } = useQuery({
    queryKey: ['partner-name-from-users', partnerId],
    queryFn: async () => {
      const { data } = await api.supabase
        .from('users')
        .select('name')
        .eq('id', partnerId!)
        .single();
      console.log('🔍 Partner name from users table:', data?.name);
      return data?.name || null;
    },
    enabled: !!partnerId && !partnerOnboarding?.name,
    staleTime: 60000, // Cache for 1 minute
  });

  // Debug: Log partner data
  useEffect(() => {
    if (partnerId) {
      console.log('🔍 Partner ID:', partnerId);
      console.log('🔍 Is Loading Partner Data:', isLoadingPartner);
      console.log('🔍 Partner Error:', partnerError);
      console.log('🔍 Partner Onboarding Data:', partnerOnboarding);
      console.log('🔍 Partner Name from Data:', partnerOnboarding?.name);
      console.log('🔍 Partner Name from Users Table:', partnerNameFromUsers);
    }
  }, [partnerId, isLoadingPartner, partnerError, partnerOnboarding, partnerNameFromUsers]);

  // Compute partner name with fallback chain
  const partnerName = partnerOnboarding?.name || partnerNameFromUsers || 'Partner';

  // Always compute userData, even if onboarding is null (use fallbacks)
  const userData = {
    name: onboarding?.name || 'there',
    partnerName: partnerName,
  };

  // Debug: Log final userData
  useEffect(() => {
    console.log('🎯 Final userData:', userData);
    console.log('🎯 Final partnerName being used:', userData?.partnerName);
    console.log('🎯 Computed partnerName value:', partnerName);
    console.log('🎯 partnerOnboarding?.name:', partnerOnboarding?.name);
  }, [userData, partnerName, partnerOnboarding]);

  const handleOnboardingComplete = () => {
    setCurrentView('home');
  };

  const handleNavigate = (page: string, data?: any) => {
    if (page === 'need-support-plan' && data?.need) {
      setSupportPlanNeed(data.need);
    }
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
            // After successful sign up, go to relationship mode setup
            setTimeout(() => {
              setCurrentView('relationship-mode-setup');
            }, 2000);
          }}
          onBack={() => setCurrentView('feature-slides')}
        />
      )}

      {/* New Relationship Mode Setup Flow */}
      {currentView === 'relationship-mode-setup' && user && (
        <RelationshipModeSetup onNavigate={handleNavigate} />
      )}

      {currentView === 'solo-mode-setup' && user && (
        <SoloModeSetup onNavigate={handleNavigate} />
      )}

      {currentView === 'partner-insights-form' && (
        <PartnerInsightsForm />
      )}

      {/* Legacy onboarding (can be removed or used as fallback) */}
      {currentView === 'onboarding' && user && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {/* New comprehensive profile onboarding */}
      {currentView === 'profile-onboarding' && user && (
        <PartnerProfileOnboarding
          userId={user.id}
          coupleId={user.id} // Will be set properly when couple is created
          partnerName="your partner"
          onComplete={handleOnboardingComplete}
        />
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
          partnerName={userData?.partnerName || 'Partner'}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'daily-question' && (
        <DailyQuestion
          onComplete={handleBack}
          partnerName={userData?.partnerName || 'Partner'}
        />
      )}

      {currentView === 'love-language' && userData && (
        <LoveLanguageSuggestions
          onBack={handleBack}
          partnerName={userData.partnerName || 'Partner'}
        />
      )}

      {currentView === 'love-language-quiz' && user && (
        <LoveLanguageQuiz
          onComplete={() => {
            setCurrentView('settings');
            toast.success('Love language quiz completed!');
          }}
          onBack={() => setCurrentView('settings')}
        />
      )}

      {currentView === 'weekly-suggestions' && (
        <WeeklySuggestions onBack={handleBack} />
      )}

      {currentView === 'dates' && (
        <DatesWrapper
          onBack={handleBack}
          partnerName={userData?.partnerName || 'Partner'}
        />
      )}

      {currentView === 'gifts' && userData && (
        <GiftGuidance
          onBack={handleBack}
          partnerName={userData.partnerName || 'Partner'}
        />
      )}

      {currentView === 'messages' && (
        <LoveMessages onBack={handleBack} />
      )}

      {currentView === 'capacity-checkin' && user && (
        <CapacityCheckIn
          onComplete={() => setCurrentView('home')}
          onBack={() => setCurrentView('home')}
        />
      )}

      {currentView === 'requests' && (
        <PartnerRequests onBack={handleBack} />
      )}

      {currentView === 'weekly-wishes' && userData && (
        <WeeklyWishes
          onBack={handleBack}
          partnerName={userData.partnerName || 'Partner'}
        />
      )}

      {currentView === 'tracker' && userData && (
        <RelationshipTracker
          onBack={handleBack}
          partnerName={userData.partnerName || 'Partner'}
        />
      )}

      {currentView === 'memories' && (
        <Memories onBack={handleBack} />
      )}

      {currentView === 'things-to-remember' && (
        <ThingsToRemember onBack={handleBack} />
      )}

      {currentView === 'create-lockscreen-gift' && (
        <CreateLockscreenGift onBack={handleBack} />
      )}

      {currentView === 'view-lockscreen-gift' && (
        <ViewLockscreenGift onBack={handleBack} />
      )}


      {currentView === 'dragon' && (
        <DragonPet onBack={handleBack} />
      )}

      {currentView === 'dragon-demo' && (
        <DragonEvolutionDemo onBack={handleBack} />
      )}

      {currentView === 'need-support-plan' && supportPlanNeed && (
        <NeedSupportPlan
          need={supportPlanNeed}
          partnerName={userData?.partnerName || 'Partner'}
          onBack={() => setCurrentView('home')}
          onComplete={() => {
            setSupportPlanNeed(null);
            setCurrentView('home');
          }}
        />
      )}

      {currentView === 'couples-challenges' && (
        <CouplesChallenges onBack={handleBack} />
      )}

      {currentView === 'icebreakers' && (
        <Icebreakers onBack={handleBack} />
      )}

      {currentView === 'something-feels-missing' && (
        <SomethingFeelsMissing onBack={handleBack} />
      )}

      {currentView === 'settings' && (
        <Settings
          onBack={handleBack}
          partnerName={userData?.partnerName || 'Partner'}
          onNavigate={handleNavigate}
          onPartnerNameUpdate={() => refetchOnboarding()}
        />
      )}
    </div>
  );
}