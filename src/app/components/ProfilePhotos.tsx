/**
 * ProfilePhotos Component
 *
 * Displays user and partner profile photos on the home screen
 * with options to upload/change photos
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Edit3 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { PhotoUpload } from './PhotoUpload';
import { onboardingService } from '../services/onboardingService';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

interface ProfilePhotosProps {
  userName: string;
  partnerName?: string;
  onPhotosUpdated?: () => void;
}

export function ProfilePhotos({ userName, partnerName, onPhotosUpdated }: ProfilePhotosProps) {
  const { user } = useAuth();
  const [showUserUpload, setShowUserUpload] = useState(false);
  const [showPartnerUpload, setShowPartnerUpload] = useState(false);

  // Query user's onboarding data for photos
  const { data: userOnboarding, refetch: refetchUserOnboarding } = useQuery({
    queryKey: ['user-onboarding', user?.id],
    queryFn: () => user?.id ? onboardingService.getOnboarding(user.id) : null,
    enabled: !!user?.id,
  });

  // Query partner's onboarding data for photos
  const { data: partnerOnboarding, refetch: refetchPartnerOnboarding } = useQuery({
    queryKey: ['partner-onboarding-photos', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // For now, we'll store partner photos in the user's onboarding data
      // This can be expanded later to fetch from partner's actual onboarding
      const userData = await onboardingService.getOnboarding(user.id);
      return userData;
    },
    enabled: !!user?.id,
  });

  const handleUserPhotoUploaded = async (photoUrl: string) => {
    if (!user?.id) return;

    try {
      await onboardingService.updateOnboarding(user.id, {
        userPhotoUrl: photoUrl,
      });
      await refetchUserOnboarding();
      onPhotosUpdated?.();
    } catch (error) {
      console.error('Failed to update user photo:', error);
    }
  };

  const handlePartnerPhotoUploaded = async (photoUrl: string) => {
    if (!user?.id) return;

    try {
      await onboardingService.updateOnboarding(user.id, {
        partnerPhotoUrl: photoUrl,
      });
      await refetchPartnerOnboarding();
      onPhotosUpdated?.();
    } catch (error) {
      console.error('Failed to update partner photo:', error);
    }
  };

  const handleUserPhotoRemoved = async () => {
    if (!user?.id) return;

    try {
      await onboardingService.updateOnboarding(user.id, {
        userPhotoUrl: '',
      });
      await refetchUserOnboarding();
      onPhotosUpdated?.();
    } catch (error) {
      console.error('Failed to remove user photo:', error);
    }
  };

  const handlePartnerPhotoRemoved = async () => {
    if (!user?.id) return;

    try {
      await onboardingService.updateOnboarding(user.id, {
        partnerPhotoUrl: '',
      });
      await refetchPartnerOnboarding();
      onPhotosUpdated?.();
    } catch (error) {
      console.error('Failed to remove partner photo:', error);
    }
  };

  return (
    <div className="flex items-center justify-center gap-6 px-4 py-4">
      {/* User Photo */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar className="w-16 h-16 border-3 border-white shadow-lg">
            <AvatarImage
              src={userOnboarding?.user_photo_url || undefined}
              alt={userName}
            />
            <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-400 text-white text-lg font-semibold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setShowUserUpload(true)}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
        <span className="text-sm font-medium text-gray-700 text-center">{userName}</span>
      </div>

      {/* Heart Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="flex-shrink-0"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-sm">❤️</span>
        </div>
      </motion.div>

      {/* Partner Photo */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar className="w-16 h-16 border-3 border-white shadow-lg">
            <AvatarImage
              src={partnerOnboarding?.partner_photo_url || undefined}
              alt={partnerName || 'Partner'}
            />
            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-indigo-400 text-white text-lg font-semibold">
              {partnerName ? partnerName.charAt(0).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setShowPartnerUpload(true)}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 hover:bg-purple-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
        <span className="text-sm font-medium text-gray-700 text-center">
          {partnerName || 'Partner'}
        </span>
      </div>

      {/* User Photo Upload */}
      {showUserUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Photo</h3>
              <button
                onClick={() => setShowUserUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <PhotoUpload
              currentPhotoUrl={userOnboarding?.user_photo_url || undefined}
              onPhotoUploaded={handleUserPhotoUploaded}
              onPhotoRemoved={handleUserPhotoRemoved}
              title={`Update ${userName}'s Photo`}
              placeholder="Choose your photo"
              className="mb-4"
            />
          </motion.div>
        </div>
      )}

      {/* Partner Photo Upload */}
      {showPartnerUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Partner's Photo</h3>
              <button
                onClick={() => setShowPartnerUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <PhotoUpload
              currentPhotoUrl={partnerOnboarding?.partner_photo_url || undefined}
              onPhotoUploaded={handlePartnerPhotoUploaded}
              onPhotoRemoved={handlePartnerPhotoRemoved}
              title={`Update ${partnerName || 'Partner'}'s Photo`}
              placeholder="Choose partner photo"
              className="mb-4"
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}
