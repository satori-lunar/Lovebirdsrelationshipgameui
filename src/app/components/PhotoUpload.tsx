/**
 * PhotoUpload Component
 *
 * Handles photo upload with camera/gallery selection, cropping, and Supabase storage.
 * Works on both web and mobile platforms.
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, X, Crop, RotateCw } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { api } from '../services/api';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUploaded: (photoUrl: string) => void;
  onPhotoRemoved?: () => void;
  title: string;
  placeholder?: string;
  className?: string;
}

interface PhotoUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelected: (file: File) => void;
  title: string;
}

function PhotoUploadDialog({ isOpen, onClose, onPhotoSelected, title }: PhotoUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onPhotoSelected(file);
      onClose();
    }
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Button
            onClick={handleGallerySelect}
            className="w-full flex items-center gap-3 py-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            <Upload className="w-5 h-5" />
            Choose from Gallery
          </Button>
          <Button
            onClick={handleGallerySelect}
            variant="outline"
            className="w-full flex items-center gap-3 py-6 border-2 border-purple-200 hover:border-purple-300"
          >
            <Camera className="w-5 h-5 text-purple-500" />
            Take Photo (Coming Soon)
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}

export function PhotoUpload({
  currentPhotoUrl,
  onPhotoUploaded,
  onPhotoRemoved,
  title,
  placeholder = "Add Photo",
  className = ""
}: PhotoUploadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handlePhotoSelected = async (file: File) => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploading(true);

    try {
      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      const { data, error } = await api.supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        // Provide more specific error messages
        if (error.message?.includes('Bucket not found')) {
          throw new Error('Photo storage is not set up yet. Please contact support.');
        } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
          throw new Error('You don\'t have permission to upload photos. Please try again.');
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }

      // Get public URL
      const { data: { publicUrl } } = api.supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      onPhotoUploaded(publicUrl);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('Failed to upload photo. Please try again.');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    if (currentPhotoUrl && onPhotoRemoved) {
      onPhotoRemoved();
    }
    setPreviewUrl(null);
  };

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsDialogOpen(true)}
          disabled={isUploading}
          className="relative w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl hover:border-gray-400 transition-colors overflow-hidden group"
        >
          {displayUrl ? (
            <div className="relative w-full h-full">
              <img
                src={displayUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-center">
                  <Camera className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm">Change Photo</div>
                </div>
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-sm">Uploading...</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 group-hover:text-gray-600 transition-colors">
              <Camera className="w-8 h-8 mb-2" />
              <div className="text-sm font-medium">{placeholder}</div>
              {isUploading && (
                <div className="mt-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
          )}
        </button>

        {(displayUrl || currentPhotoUrl) && !isUploading && (
          <button
            onClick={handleRemovePhoto}
            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <PhotoUploadDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onPhotoSelected={handlePhotoSelected}
        title={title}
      />
    </>
  );
}
