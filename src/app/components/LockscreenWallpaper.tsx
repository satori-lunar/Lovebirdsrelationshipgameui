import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Download,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Smile,
  Sprout,
  Clock,
  Settings as SettingsIcon,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useRelationship } from '../hooks/useRelationship';
import { lockscreenService } from '../services/lockscreenService';
import type {
  LockscreenWallpaperType,
  LockscreenWallpaperConfig,
  TimeWallpaperConfig,
  MessageWallpaperConfig,
  MoodWallpaperConfig,
  GrowthWallpaperConfig,
  WallpaperGenerationOptions,
} from '../types/lockscreen';

interface LockscreenWallpaperProps {
  onBack: () => void;
}

const wallpaperTypes = [
  {
    type: 'time' as const,
    icon: Clock,
    title: 'Relationship Time',
    description: 'Shows how long you\'ve been together',
    color: 'pink',
  },
  {
    type: 'message' as const,
    icon: MessageCircle,
    title: 'Partner Messages',
    description: 'Display intentional messages from your partner',
    color: 'purple',
  },
  {
    type: 'mood' as const,
    icon: Smile,
    title: 'Mood-Aware',
    description: 'Changes based on partner\'s current mood',
    color: 'blue',
  },
  {
    type: 'growth' as const,
    icon: Sprout,
    title: 'Shared Growth',
    description: 'Plant that grows with your relationship',
    color: 'green',
  },
];

export function LockscreenWallpaper({ onBack }: LockscreenWallpaperProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedType, setSelectedType] = useState<LockscreenWallpaperType>('time');
  const [config, setConfig] = useState<LockscreenWallpaperConfig | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Load existing config
  useEffect(() => {
    if (user?.id) {
      loadConfig();
    }
  }, [user?.id]);

  const loadConfig = async () => {
    try {
      const existingConfig = await lockscreenService.getConfig(user!.id);
      if (existingConfig) {
        setConfig(existingConfig);
        setSelectedType(existingConfig.type);
        setSelectedPhoto(existingConfig.photoUrl);
      } else {
        // Create default config
        createDefaultConfig('time');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      createDefaultConfig('time');
    }
  };

  const createDefaultConfig = (type: LockscreenWallpaperType) => {
    const baseConfig = {
      photoUrl: null,
      backgroundGradient: 'pink-to-purple',
      fontStyle: 'minimal' as const,
      textVisibility: 'full' as const,
      privacySettings: {
        showTextWhenLocked: true,
        pauseDuringConflict: false,
        useNeutralDesign: false,
      },
      lastUpdated: new Date().toISOString(),
    };

    let newConfig: LockscreenWallpaperConfig;

    switch (type) {
      case 'time':
        newConfig = {
          ...baseConfig,
          type: 'time',
          relationshipStartDate: relationship?.connected_at || relationship?.created_at || new Date().toISOString(),
          displayFormat: 'years_months',
          showMilestones: true,
        } as TimeWallpaperConfig;
        break;

      case 'message':
        newConfig = {
          ...baseConfig,
          type: 'message',
          currentMessage: null,
          messageExpiry: '24h',
        } as MessageWallpaperConfig;
        break;

      case 'mood':
        newConfig = {
          ...baseConfig,
          type: 'mood',
          showMoodText: true,
          colorPalette: 'warm',
          partnerCurrentMood: null,
        } as MoodWallpaperConfig;
        break;

      case 'growth':
        newConfig = {
          ...baseConfig,
          type: 'growth',
          symbolType: 'plant',
          growthLevel: 50,
          lastInteractionDate: new Date().toISOString(),
          showGrowthText: true,
        } as GrowthWallpaperConfig;
        break;
    }

    setConfig(newConfig);
  };

  const handleTypeSelect = (type: LockscreenWallpaperType) => {
    setSelectedType(type);
    createDefaultConfig(type);
  };

  const handlePhotoSelect = () => {
    // In a real implementation, this would open a photo picker
    // For now, we'll use a placeholder
    toast.info('Photo selection coming soon!', {
      description: 'For now, using your relationship photos from Memories',
    });
  };

  const generatePreview = async () => {
    if (!config) return;

    setIsGenerating(true);

    try {
      // Get device dimensions (or use standard phone dimensions)
      const width = 390; // iPhone standard width
      const height = 844; // iPhone standard height

      const options: WallpaperGenerationOptions = {
        width,
        height,
        devicePixelRatio: 2,
        format: 'png',
        quality: 0.9,
      };

      const additionalData = {
        relationshipStartDate: relationship?.connected_at || relationship?.created_at,
        partnerName: 'Partner',
      };

      if (config.type === 'growth') {
        const metrics = await lockscreenService.calculateGrowthMetrics(
          relationship!.id,
          user!.id
        );
        additionalData['growthMetrics'] = metrics;
        // Update growth level in config
        setConfig({
          ...config,
          growthLevel: metrics.growthLevel,
        } as GrowthWallpaperConfig);
      }

      const wallpaper = await lockscreenService.generateWallpaper(
        config,
        options,
        additionalData
      );

      setPreviewUrl(wallpaper.dataUrl);
      setShowInstructions(true);
    } catch (error) {
      console.error('Failed to generate wallpaper:', error);
      toast.error('Failed to generate wallpaper', {
        description: 'Please try again',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!previewUrl) {
      await generatePreview();
      return;
    }

    // Trigger download
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `lovebirds-lockscreen-${selectedType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Wallpaper downloaded!', {
      description: 'Set it as your lockscreen wallpaper',
    });
  };

  const handleSave = async () => {
    if (!config || !user || !relationship) return;

    try {
      await lockscreenService.saveConfig(user.id, relationship.id, config);
      toast.success('Configuration saved!', {
        description: 'Your lockscreen wallpaper settings have been saved',
      });
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save', {
        description: 'Please try again',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-800">Lockscreen Wallpaper</h1>
          </div>
          <div className="w-10" />
        </div>

        {/* Subtitle */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Create a dynamic wallpaper that reflects your relationship
          </p>
        </div>

        {/* Wallpaper Type Selector */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Choose Your Style</h2>
          <div className="grid grid-cols-2 gap-3">
            {wallpaperTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.type;
              const colorClasses = {
                pink: 'border-pink-500 bg-pink-50',
                purple: 'border-purple-500 bg-purple-50',
                blue: 'border-blue-500 bg-blue-50',
                green: 'border-green-500 bg-green-50',
              };

              return (
                <motion.button
                  key={type.type}
                  onClick={() => handleTypeSelect(type.type)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? colorClasses[type.color]
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon
                    className={`w-6 h-6 mb-2 ${
                      isSelected ? `text-${type.color}-600` : 'text-gray-400'
                    }`}
                  />
                  <h3 className="font-semibold text-sm text-gray-800">
                    {type.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {type.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Type-Specific Configuration */}
        {config && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedType}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <h2 className="font-semibold text-gray-800">Customize</h2>

              {/* Photo Selection */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        Background Photo
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedPhoto ? 'Photo selected' : 'Use gradient'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePhotoSelect}
                  >
                    {selectedPhoto ? 'Change' : 'Add Photo'}
                  </Button>
                </div>
              </Card>

              {/* Time-specific options */}
              {config.type === 'time' && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Show milestones</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(config as TimeWallpaperConfig).showMilestones}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            showMilestones: e.target.checked,
                          } as TimeWallpaperConfig)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                  </div>

                  <div>
                    <label className="text-sm text-gray-700 block mb-2">
                      Display format
                    </label>
                    <select
                      value={(config as TimeWallpaperConfig).displayFormat}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          displayFormat: e.target.value as any,
                        } as TimeWallpaperConfig)
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="years_months">Years & Months</option>
                      <option value="total_days">Total Days</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </Card>
              )}

              {/* Message-specific options */}
              {config.type === 'message' && (
                <Card className="p-4 space-y-3">
                  <div>
                    <label className="text-sm text-gray-700 block mb-2">
                      Message expiry
                    </label>
                    <select
                      value={(config as MessageWallpaperConfig).messageExpiry}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          messageExpiry: e.target.value as any,
                        } as MessageWallpaperConfig)
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="12h">12 hours</option>
                      <option value="24h">24 hours</option>
                      <option value="until_next">Until next message</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500">
                    Your partner can send you lockscreen messages from their app
                  </p>
                </Card>
              )}

              {/* Mood-specific options */}
              {config.type === 'mood' && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Show mood hints</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(config as MoodWallpaperConfig).showMoodText}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            showMoodText: e.target.checked,
                          } as MoodWallpaperConfig)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Updates based on your partner's mood check-ins
                  </p>
                </Card>
              )}

              {/* Growth-specific options */}
              {config.type === 'growth' && (
                <Card className="p-4 space-y-3">
                  <div>
                    <label className="text-sm text-gray-700 block mb-2">
                      Growth symbol
                    </label>
                    <select
                      value={(config as GrowthWallpaperConfig).symbolType}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          symbolType: e.target.value as any,
                        } as GrowthWallpaperConfig)
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="plant">Plant</option>
                      <option value="flower">Flower</option>
                      <option value="tree">Tree</option>
                      <option value="star_constellation">Star Constellation</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Show growth text</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(config as GrowthWallpaperConfig).showGrowthText}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            showGrowthText: e.target.checked,
                          } as GrowthWallpaperConfig)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>

                  <p className="text-xs text-gray-500">
                    Grows based on daily questions, mood sharing, and check-ins
                  </p>
                </Card>
              )}

              {/* Text & Privacy Settings */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <SettingsIcon className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-sm text-gray-700">
                    Display & Privacy
                  </span>
                </div>

                <div>
                  <label className="text-sm text-gray-700 block mb-2">
                    Text visibility
                  </label>
                  <select
                    value={config.textVisibility}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        textVisibility: e.target.value as any,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="full">Full text</option>
                    <option value="minimal">Minimal text</option>
                    <option value="none">No text</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Neutral design (work/school)
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.privacySettings.useNeutralDesign}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          privacySettings: {
                            ...config.privacySettings,
                            useNeutralDesign: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-500"></div>
                  </label>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Preview */}
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h2 className="font-semibold text-gray-800">Preview</h2>
            <Card className="p-3 bg-gray-100">
              <div className="aspect-[9/19.5] rounded-2xl overflow-hidden shadow-xl mx-auto max-w-[280px]">
                <img
                  src={previewUrl}
                  alt="Lockscreen preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pb-6">
          <Button
            onClick={generatePreview}
            disabled={isGenerating}
            className="w-full bg-pink-500 hover:bg-pink-600"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                Generate Preview
              </>
            )}
          </Button>

          {previewUrl && (
            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Wallpaper
            </Button>
          )}

          <Button onClick={handleSave} variant="outline" className="w-full">
            Save Configuration
          </Button>
        </div>

        {/* Instructions */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-blue-50 border-blue-100 p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">
                      How to set as lockscreen:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700">
                      <li>Download the wallpaper</li>
                      <li>Go to Settings → Wallpaper</li>
                      <li>Choose "Add New Wallpaper"</li>
                      <li>Select the downloaded image</li>
                      <li>Set as "Lock Screen"</li>
                    </ol>
                    <p className="mt-3 text-blue-600 text-xs">
                      💡 Generate a new wallpaper anytime to update it!
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info about dynamic updates */}
        <div className="text-center text-xs text-gray-400 pb-4">
          <p>Your wallpaper reflects the state of your relationship</p>
          <p>Generate new wallpapers as often as you like</p>
        </div>
      </div>
    </div>
  );
}
