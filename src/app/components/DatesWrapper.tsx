import { useState } from 'react';
import { DateHub } from './DateHub';
import { DatePlanner } from './DatePlanner';
import { DatePlanning } from './DatePlanning';
import { DateChallenge } from './DateChallenge';

interface DatesWrapperProps {
  onBack: () => void;
  partnerName: string;
}

type DateMode = 'hub' | 'personalized' | 'challenge';

export function DatesWrapper({ onBack, partnerName }: DatesWrapperProps) {
  const [mode, setMode] = useState<DateMode>('hub');

  const handleSelectMode = (selectedMode: 'personalized' | 'challenge') => {
    setMode(selectedMode);
  };

  const handleBackToHub = () => {
    setMode('hub');
  };

  if (mode === 'hub') {
    return (
      <DateHub
        onBack={onBack}
        onSelectMode={handleSelectMode}
        partnerName={partnerName}
      />
    );
  }

  if (mode === 'personalized') {
    return (
      <DatePlanner
        onBack={handleBackToHub}
        partnerName={partnerName}
      />
    );
  }

  if (mode === 'challenge') {
    return (
      <DateChallenge
        onBack={handleBackToHub}
        partnerName={partnerName}
      />
    );
  }

  return null;
}
