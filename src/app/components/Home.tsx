/**
 * Home Screen Component - New Figma Design
 *
 * A redesigned home screen with modern UI elements including:
 * - Couple photo with anniversary tracker
 * - Partner's capacity display
 * - Quick action buttons for engagement
 * - Upcoming dates and streaks
 */

import React, { useState, useEffect } from 'react';
import { Calendar, MessageCircle, Heart, Camera, Clock, MapPin, Navigation, Edit } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { useLocation } from '../hooks/useLocation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onboardingService } from '../services/onboardingService';
import { api } from '../services/api';
import { useSharedCalendar } from '../hooks/useSharedCalendar';
import { useMoodUpdates } from '../hooks/useMoodUpdates';
import { toast } from 'sonner';
import { PhotoUpload } from './PhotoUpload';

interface HomeProps {
  userName: string;
  partnerName: string;
  onNavigate: (page: string, data?: any) => void;
  showWelcomeFlow?: boolean;
}

export function Home({ userName, partnerName, onNavigate }: HomeProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState('home');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [capacityLevel, setCapacityLevel] = useState<number>(50);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCouplePhotoUpload, setShowCouplePhotoUpload] = useState(false);

  // Debug: Log props received by Home component
  useEffect(() => {
    console.log('🏠 Home component received props:', {
      userName,
      partnerName,
      partnerNameLength: partnerName?.length,
      partnerNameType: typeof partnerName
    });
    console.log('🏠 partnerName exact value:', JSON.stringify(partnerName));
  }, [userName, partnerName]);

  // Handle couple photo upload
  const handleCouplePhotoUploaded = async (photoUrl: string) => {
    if (!relationship?.id) return;

    try {
      const { error } = await api.supabase
        .from('relationships')
        .update({ couple_photo_url: photoUrl })
        .eq('id', relationship.id);

      if (error) throw error;

      // Refresh relationship data
      queryClient.invalidateQueries({ queryKey: ['relationship'] });
      toast.success('Couple photo updated!');
      setShowCouplePhotoUpload(false);
    } catch (error) {
      console.error('Error updating couple photo:', error);
      toast.error('Failed to update couple photo');
    }
  };

  // Use mood updates hook for partner's capacity
  const { partnerMood } = useMoodUpdates();

  // Location tracking
  const {
    userLocation,
    partnerLocation,
    shareWithApp,
    shareWithPartner,
    isUpdating: isUpdatingLocation,
    requestPermission,
    updateSharingSettings,
    distanceToPartner,
  } = useLocation();

  // Start location tracking on mount
  useEffect(() => {
    if ((shareWithApp || shareWithPartner) && user?.id) {
      // Location updates handled by useLocation hook
    }
  }, [shareWithApp, shareWithPartner, user?.id]);

  // Fetch user's onboarding data for profile photo
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user?.id,
  });

  // Calculate time together
  const getTimeTogether = () => {
    if (!relationship?.relationship_start_date) return 'Just Started';

    const anniversary = new Date(relationship.relationship_start_date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - anniversary.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);

    if (years > 0) {
      return `${years} Year${years > 1 ? 's' : ''}, ${months} Month${months !== 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} Month${months !== 1 ? 's' : ''}`;
    } else {
      return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
    }
  };

  // Convert capacity percentage to energy level description
  const getEnergyLevel = (percentage: number): string => {
    if (percentage >= 80) return 'High Energy';
    if (percentage >= 60) return 'Good Energy';
    if (percentage >= 40) return 'Moderate Energy';
    if (percentage >= 20) return 'Low Energy';
    return 'Numb and Disconnected';
  };

  // Get color for capacity level
  const getCapacityColor = (percentage: number): string => {
    if (percentage >= 80) return '#10B981'; // green
    if (percentage >= 60) return '#3B82F6'; // blue
    if (percentage >= 40) return '#F59E0B'; // orange
    if (percentage >= 20) return '#EF4444'; // red
    return '#6B7280'; // gray
  };

  // Get partner's mood display
  const getPartnerMood = () => {
    if (!partnerMood) return 'Not Updated';

    // Map mood string to display text
    const moodMap: Record<string, string> = {
      'great': 'Feeling Great',
      'good': 'Feeling Good',
      'okay': 'Feeling Okay',
      'low': 'Feeling Low',
      'struggling': 'Struggling',
      'numb': 'Disconnected'
    };

    return moodMap[partnerMood.mood] || 'Unknown';
  };

  // Get partner's capacity percentage from mood string
  const getPartnerCapacityLevel = () => {
    if (!partnerMood || !partnerMood.mood) return null;

    // Convert mood string to percentage for display
    const moodToPercentage: Record<string, number> = {
      'great': 90,
      'good': 70,
      'okay': 50,
      'low': 30,
      'struggling': 15,
      'numb': 5
    };

    return moodToPercentage[partnerMood.mood] || 50;
  };

  const handleTabNavigation = (tab: string) => {
    setCurrentTab(tab);

    // Map tabs to existing navigation routes
    const tabRouteMap: Record<string, string> = {
      'calendar': 'tracker',
      'messages': 'messages',
      'dates': 'dates',
      'memories': 'memories',
    };

    if (tab !== 'home' && tabRouteMap[tab]) {
      onNavigate(tabRouteMap[tab]);
    }
  };

  const handleUpdateCapacity = async () => {
    if (!user?.id || !relationship?.id) {
      toast.error('Please sign in to update your capacity');
      return;
    }

    // Convert percentage to mood string that matches database schema
    let moodString: string;
    if (capacityLevel >= 80) moodString = 'great';
    else if (capacityLevel >= 60) moodString = 'good';
    else if (capacityLevel >= 40) moodString = 'okay';
    else if (capacityLevel >= 20) moodString = 'low';
    else if (capacityLevel >= 10) moodString = 'struggling';
    else moodString = 'numb';

    setIsUpdating(true);

    try {
      const { error } = await api.supabase
        .from('capacity_checkins')
        .insert({
          user_id: user.id,
          couple_id: relationship.id,
          mood: moodString,
        });

      if (error) throw error;

      toast.success(`Capacity updated: ${getEnergyLevel(capacityLevel)}`);
    } catch (error) {
      toast.error('Failed to update capacity. Please try again.');
      console.error('Capacity update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLocationSharingChange = async (mode: 'off' | 'app' | 'partner') => {
    try {
      // Request permission if enabling any tracking
      if (mode !== 'off') {
        const permitted = await requestPermission();
        if (!permitted) {
          toast.error('Location permission denied. Please enable it in your device settings.');
          return;
        }
      }

      let success = false;
      let message = '';

      switch (mode) {
        case 'off':
          success = await updateSharingSettings(false, false);
          message = 'Location sharing disabled';
          break;
        case 'app':
          success = await updateSharingSettings(true, false);
          message = 'Sharing with app only (for features)';
          break;
        case 'partner':
          success = await updateSharingSettings(true, true);
          message = 'Sharing with app and partner';
          break;
      }

      if (success) {
        toast.success(message);
      } else {
        toast.error('Failed to update location sharing');
      }
    } catch (error) {
      toast.error('Failed to update location sharing');
      console.error('Location sharing error:', error);
    }
  };

  const getLocationSharingMode = (): 'off' | 'app' | 'partner' => {
    if (!shareWithApp && !shareWithPartner) return 'off';
    if (shareWithApp && !shareWithPartner) return 'app';
    return 'partner';
  };

  return (
    <div className="bg-[#F5F0F6] flex flex-col h-screen w-full max-w-[430px] mx-auto">
      {/* Status Bar */}
      <div className="bg-transparent h-[44px] px-6 flex items-center justify-between">
        <p className="text-[16px]">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
        <div className="flex gap-1 items-center">
          <div className="w-[18px] h-[10px]" />
          <div className="w-[15px] h-[11px]" />
          <div className="w-[27px] h-[13px]" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Couple Photo with Anniversary Tracker */}
        <div className="relative w-full h-[200px] mb-6 px-5">
          <div className="relative w-full h-full rounded-3xl overflow-hidden group">
            <img
              src={relationship?.couple_photo_url || "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80"}
              alt="Couple"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

            {/* Edit Photo Button */}
            <button
              onClick={() => setShowCouplePhotoUpload(true)}
              className="absolute top-3 right-3 bg-white/80 backdrop-blur-xl p-2 rounded-full shadow-lg border border-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
            >
              <Edit className="w-4 h-4 text-[#2c2c2c]" />
            </button>

            {/* Anniversary Tracker Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl rounded-2xl px-5 py-3 min-w-[240px] text-center shadow-lg border border-white/60">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-[#FF2D55]" fill="#FF2D55" />
                <p className="font-['Lora',serif] text-[16px] text-[#2c2c2c]">Together for</p>
              </div>
              <p className="font-['Nunito_Sans',sans-serif] text-[20px] text-[#FF2D55]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                {getTimeTogether()}
              </p>
            </div>
          </div>
        </div>

        {/* Couple Photo Upload Dialog */}
        {showCouplePhotoUpload && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-['Nunito_Sans',sans-serif] text-[20px] font-semibold">
                  Upload Couple Photo
                </h3>
                <button
                  onClick={() => setShowCouplePhotoUpload(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Camera className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <PhotoUpload
                currentPhotoUrl={relationship?.couple_photo_url}
                onPhotoUploaded={handleCouplePhotoUploaded}
                title="Choose Couple Photo"
                placeholder="Upload a photo of you two together"
                className="mb-4"
              />
            </div>
          </div>
        )}

        {/* Partner's Capacity */}
        <div className="px-5 mb-5">
          <div className="bg-gradient-to-br from-[#FF2D55] to-[#FF6B9D] rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white">
                    <span className="text-2xl">{partnerName.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-['Nunito_Sans',sans-serif] text-[18px] text-white" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    {partnerName}
                  </p>
                  <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-white/80" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    {getPartnerMood()}
                  </p>
                  {getPartnerCapacityLevel() !== null && (
                    <div className="mt-2">
                      <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-white/90 mb-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                        {getEnergyLevel(getPartnerCapacityLevel()!)} • {getPartnerCapacityLevel()}%
                      </p>
                      <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-300"
                          style={{ width: `${getPartnerCapacityLevel()}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Heart className="w-8 h-8 text-white flex-shrink-0" fill="white" />
            </div>
          </div>
        </div>

        {/* Location Tracking */}
        <div className="px-5 mb-5">
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-5 shadow-md border border-white/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Location Sharing
                </h3>
                <p className="font-['Nunito_Sans',sans-serif] text-[13px] text-[#6d6d6d]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Choose how to share your location
                </p>
              </div>
            </div>

            {/* Location Sharing Options */}
            <div className="space-y-3 mb-4">
              {/* Off */}
              <button
                onClick={() => handleLocationSharingChange('off')}
                disabled={isUpdatingLocation}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  getLocationSharingMode() === 'off'
                    ? 'border-[#06B6D4] bg-[#06B6D4]/10'
                    : 'border-gray-200 bg-white'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    getLocationSharingMode() === 'off' ? 'border-[#06B6D4]' : 'border-gray-300'
                  }`}>
                    {getLocationSharingMode() === 'off' && (
                      <div className="w-3 h-3 rounded-full bg-[#06B6D4]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#2c2c2c] font-semibold" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                      Off
                    </p>
                    <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-[#6d6d6d]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                      No location tracking
                    </p>
                  </div>
                </div>
              </button>

              {/* App Only */}
              <button
                onClick={() => handleLocationSharingChange('app')}
                disabled={isUpdatingLocation}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  getLocationSharingMode() === 'app'
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                    : 'border-gray-200 bg-white'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    getLocationSharingMode() === 'app' ? 'border-[#8B5CF6]' : 'border-gray-300'
                  }`}>
                    {getLocationSharingMode() === 'app' && (
                      <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#2c2c2c] font-semibold" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                      App Only
                    </p>
                    <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-[#6d6d6d]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                      For date suggestions, not visible to {partnerName}
                    </p>
                  </div>
                </div>
              </button>

              {/* Share with Partner */}
              <button
                onClick={() => handleLocationSharingChange('partner')}
                disabled={isUpdatingLocation}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  getLocationSharingMode() === 'partner'
                    ? 'border-[#FF2D55] bg-[#FF2D55]/10'
                    : 'border-gray-200 bg-white'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    getLocationSharingMode() === 'partner' ? 'border-[#FF2D55]' : 'border-gray-300'
                  }`}>
                    {getLocationSharingMode() === 'partner' && (
                      <div className="w-3 h-3 rounded-full bg-[#FF2D55]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#2c2c2c] font-semibold" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                      Share with {partnerName}
                    </p>
                    <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-[#6d6d6d]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                      {partnerName} can see your location in real-time
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Show distance if both are sharing with partner */}
            {shareWithPartner && partnerLocation && distanceToPartner() && (
              <div className="mt-4 p-3 bg-gradient-to-br from-[#06B6D4]/10 to-[#3B82F6]/10 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-4 h-4 text-[#06B6D4]" />
                  <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#2c2c2c] font-semibold" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    {distanceToPartner()!.formatted}
                  </p>
                </div>
                <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-[#6d6d6d]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Distance to {partnerName}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Three Column Grid */}
        <div className="px-5 mb-5">
          <h3 className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#2c2c2c] mb-4 px-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
            Connect & Grow
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Daily Questions */}
            <button
              onClick={() => onNavigate('daily-question')}
              className="bg-white/70 backdrop-blur-lg rounded-3xl p-4 flex flex-col items-center justify-center gap-3 min-h-[140px] hover:shadow-xl transition-all shadow-md border border-white/60 hover:bg-white/80"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center shadow-lg">
                <MessageCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <p className="font-['Nunito_Sans',sans-serif] text-[13px] text-[#2c2c2c] text-center leading-tight" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                Daily<br/>Questions
              </p>
            </button>

            {/* Couples Challenges */}
            <button
              onClick={() => onNavigate('weekly-suggestions')}
              className="bg-white/70 backdrop-blur-lg rounded-3xl p-4 flex flex-col items-center justify-center gap-3 min-h-[140px] hover:shadow-xl transition-all shadow-md border border-white/60 hover:bg-white/80"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF2D55] to-[#FF6B9D] flex items-center justify-center shadow-lg">
                <Heart className="w-8 h-8 text-white" strokeWidth={2.5} fill="white" />
              </div>
              <p className="font-['Nunito_Sans',sans-serif] text-[13px] text-[#2c2c2c] text-center leading-tight" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                Couples<br/>Challenges
              </p>
            </button>

            {/* Icebreakers */}
            <button
              onClick={() => onNavigate('icebreakers')}
              className="bg-white/70 backdrop-blur-lg rounded-3xl p-4 flex flex-col items-center justify-center gap-3 min-h-[140px] hover:shadow-xl transition-all shadow-md border border-white/60 hover:bg-white/80"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-['Nunito_Sans',sans-serif] text-[13px] text-[#2c2c2c] text-center leading-tight" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                Ice-<br/>breakers
              </p>
            </button>
          </div>
        </div>

        {/* Set Your Capacity */}
        <div className="px-5 mb-5">
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-5 shadow-md border border-white/60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white font-bold text-xl">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h3 className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Set Your Capacity
                  </h3>
                  <p className="font-['Nunito_Sans',sans-serif] text-[13px] text-[#6d6d6d]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    {userName}
                  </p>
                </div>
              </div>
            </div>

            {/* Capacity Slider */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Energy Level
                </p>
                <p
                  className="font-['Nunito_Sans',sans-serif] text-[16px] font-bold"
                  style={{
                    fontVariationSettings: "'YTLC' 500, 'wdth' 100",
                    color: getCapacityColor(capacityLevel)
                  }}
                >
                  {capacityLevel}%
                </p>
              </div>

              {/* Slider */}
              <div className="relative mb-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={capacityLevel}
                  onChange={(e) => setCapacityLevel(Number(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${getCapacityColor(capacityLevel)} 0%, ${getCapacityColor(capacityLevel)} ${capacityLevel}%, #E5E7EB ${capacityLevel}%, #E5E7EB 100%)`
                  }}
                />
              </div>

              {/* Energy Level Description */}
              <div className="text-center py-3 px-4 rounded-xl" style={{ backgroundColor: `${getCapacityColor(capacityLevel)}15` }}>
                <p
                  className="font-['Nunito_Sans',sans-serif] text-[15px] font-semibold"
                  style={{
                    fontVariationSettings: "'YTLC' 500, 'wdth' 100",
                    color: getCapacityColor(capacityLevel)
                  }}
                >
                  {getEnergyLevel(capacityLevel)}
                </p>
              </div>

              {/* Energy Level Labels */}
              <div className="flex justify-between mt-3 text-[11px] text-[#9CA3AF] px-1">
                <span>Numb</span>
                <span>Low</span>
                <span>Moderate</span>
                <span>Good</span>
                <span>High</span>
              </div>
            </div>

            <button
              onClick={handleUpdateCapacity}
              disabled={isUpdating}
              className="w-full text-white rounded-2xl py-3 font-['Nunito_Sans',sans-serif] text-[16px] hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontVariationSettings: "'YTLC' 500, 'wdth' 100",
                backgroundColor: getCapacityColor(capacityLevel)
              }}
            >
              {isUpdating ? 'Updating...' : 'Update Capacity'}
            </button>
          </div>
        </div>

        {/* Helping Hand */}
        <div className="px-5 mb-5">
          <div
            onClick={() => onNavigate('helping-hand')}
            className="bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA] rounded-3xl p-5 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] text-white mb-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Helping Hand
                  </h3>
                  <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-white/80" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Get suggestions to support {partnerName}
                  </p>
                </div>
              </div>
              <svg className="w-6 h-6 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Anniversary Tracker */}
        <div className="px-5 mb-5">
          <div
            onClick={() => onNavigate('anniversary-tracker')}
            className="bg-gradient-to-br from-[#EC4899] to-[#F472B6] rounded-3xl p-5 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] text-white mb-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Anniversary Tracker
                  </h3>
                  <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-white/80" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Track milestones & special dates
                  </p>
                </div>
              </div>
              <svg className="w-6 h-6 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Insights & Notes */}
        <div className="px-5 mb-5">
          <div
            onClick={() => onNavigate('insights-notes')}
            className="bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-3xl p-5 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] text-white mb-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Insights & Notes
                  </h3>
                  <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-white/80" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Relationship insights & reminders
                  </p>
                </div>
              </div>
              <svg className="w-6 h-6 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Upcoming Date */}
        <div className="px-5 mb-5">
          <div className="bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] rounded-3xl p-5 shadow-lg cursor-pointer hover:shadow-xl transition-all" onClick={() => onNavigate('dates')}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-['Nunito_Sans',sans-serif] text-[18px] text-white mb-2" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Plan Your Next Date
                </p>
                <div className="flex items-center gap-2 text-white/90">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="font-['Nunito_Sans',sans-serif] text-[14px]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Find perfect date ideas
                  </p>
                </div>
              </div>
              <div className="text-3xl">💝</div>
            </div>
            <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-white/80" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              Tap to explore date ideas
            </p>
          </div>
        </div>

        {/* Streaks */}
        <div className="px-5 mb-6">
          <h3 className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#2c2c2c] mb-3 px-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
            Your Journey
          </h3>
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-5 text-center shadow-md border border-white/60">
            <div className="text-3xl mb-2">🔥</div>
            <p className="font-['Nunito_Sans',sans-serif] text-[28px] text-[#FF2D55] mb-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              {relationship?.streak || 0}
            </p>
            <p className="font-['Nunito_Sans',sans-serif] text-[13px] text-[#6d6d6d]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              Daily streak
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-white/40 pb-6 pt-2 px-4 shadow-lg">
        <div className="flex justify-around items-center max-w-[430px] mx-auto">
          <button
            onClick={() => handleTabNavigation('calendar')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentTab === 'calendar' ? 'text-[#d9a0b8]' : 'text-[#6d6d6d]'
            }`}
          >
            <Calendar className="w-6 h-6" />
            <p className="font-['Nunito_Sans',sans-serif] text-[11px]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              Calendar
            </p>
          </button>

          <button
            onClick={() => handleTabNavigation('messages')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentTab === 'messages' ? 'text-[#d9a0b8]' : 'text-[#6d6d6d]'
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            <p className="font-['Nunito_Sans',sans-serif] text-[11px]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              Messages
            </p>
          </button>

          <button
            onClick={() => handleTabNavigation('home')}
            className="flex flex-col items-center gap-1 px-4 py-2 -mt-8"
          >
            <div className="bg-[#d9a0b8] rounded-full p-4 shadow-lg">
              <Heart className="w-7 h-7 text-white" fill="white" />
            </div>
          </button>

          <button
            onClick={() => handleTabNavigation('dates')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentTab === 'dates' ? 'text-[#d9a0b8]' : 'text-[#6d6d6d]'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-['Nunito_Sans',sans-serif] text-[11px]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              Date Ideas
            </p>
          </button>

          <button
            onClick={() => handleTabNavigation('memories')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentTab === 'memories' ? 'text-[#d9a0b8]' : 'text-[#6d6d6d]'
            }`}
          >
            <Camera className="w-6 h-6" />
            <p className="font-['Nunito_Sans',sans-serif] text-[11px]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              Memories
            </p>
          </button>
        </div>

        {/* Home Indicator */}
        <div className="flex justify-center mt-4">
          <div className="bg-black h-[5px] w-[98px] rounded-full" />
        </div>
      </div>
    </div>
  );
}
