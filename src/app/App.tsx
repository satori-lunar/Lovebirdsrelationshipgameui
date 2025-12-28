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

type AppState = 'landing' | 'onboarding' | 'home' | 'daily-question' | 'love-language' | 'dates' | 'gifts' | 'tracker' | 'memories' | 'settings';

export default function App() {
  const [currentView, setCurrentView] = useState<AppState>('landing');
  const [userData, setUserData] = useState<any>(null);

  const handleOnboardingComplete = (data: any) => {
    setUserData(data);
    setCurrentView('home');
  };

  const handleNavigate = (page: string) => {
    setCurrentView(page as AppState);
  };

  const handleBack = () => {
    setCurrentView('home');
  };

  return (
    <div className="size-full bg-gradient-to-b from-pink-50 to-purple-50">
      <Toaster />
      {currentView === 'landing' && (
        <Landing onGetStarted={() => setCurrentView('onboarding')} />
      )}

      {currentView === 'onboarding' && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {currentView === 'home' && userData && (
        <Home 
          userName={userData.name || 'there'}
          partnerName={userData.partnerName || 'your partner'}
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