import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Calendar,
  MessageCircle,
  Palette,
  Eye,
  Gift,
  Upload,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useRelationship } from '../hooks/useRelationship';
import { lockscreenGiftService } from '../services/lockscreenGiftService';
import type {
  CreationStep,
  LockscreenWallpaperDesign,
  WallpaperLayout,
  MoodPreset,
  FontStyle,
  TextPlacement,
  WallpaperImage,
} from '../types/lockscreenGift';

interface CreateLockscreenGiftProps {
  onBack: () => void;
}

export function CreateLockscreenGift({ onBack }: CreateLockscreenGiftProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();

  const [currentStep, setCurrentStep] = useState<CreationStep>('layout');
  const [design, setDesign] = useState<Partial<LockscreenWallpaperDesign>>({
    images: [],
    style: {
      moodPreset: 'soft_romantic',
      textColor: '#ffffff',
      accentColor: '#ffd700',
      overlayGradient: 'none',
      overlayIntensity: 30,
    },
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const steps: CreationStep[] = ['layout', 'images', 'date', 'message', 'style', 'preview', 'gift'];
  const currentStepIndex = steps.indexOf(currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'layout':
        return !!design.layout;
      case 'images':
        return design.images && design.images.length > 0;
      case 'date':
        return true; // Optional
      case 'message':
        return true; // Optional
      case 'style':
        return true;
      case 'preview':
        return !!previewUrl;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    try {
      const wallpaper = await lockscreenGiftService.generateWallpaper(
        design as LockscreenWallpaperDesign,
        {
          width: 390,
          height: 844,
          devicePixelRatio: 2,
          format: 'png',
          quality: 0.9,
          optimizeForLockscreen: true,
        }
      );
      setPreviewUrl(wallpaper.dataUrl);
      toast.success('Preview generated!');
    } catch (error) {
      console.error('Failed to generate preview:', error);
      toast.error('Failed to generate preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendGift = async () => {
    if (!relationship) {
      toast.error('No relationship found');
      return;
    }

    const partnerId = user?.id === relationship.partner_a_id
      ? relationship.partner_b_id
      : relationship.partner_a_id;

    if (!partnerId) {
      toast.error('Partner not found');
      return;
    }

    setIsSending(true);
    try {
      await lockscreenGiftService.sendGift({
        receiverId: partnerId,
        relationshipId: relationship.id,
        design: design as LockscreenWallpaperDesign,
      });

      toast.success('Gift sent! 🎁', {
        description: 'Your partner will receive a beautiful notification',
      });

      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to send gift:', error);
      toast.error('Failed to send gift', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsSending(false);
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
            <h1 className="text-xl font-bold text-gray-800">Create Lockscreen Gift</h1>
            <p className="text-xs text-gray-500 mt-1">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-pink-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {currentStep === 'layout' && (
              <LayoutStep design={design} setDesign={setDesign} />
            )}
            {currentStep === 'images' && (
              <ImagesStep design={design} setDesign={setDesign} />
            )}
            {currentStep === 'date' && (
              <DateStep design={design} setDesign={setDesign} relationship={relationship} />
            )}
            {currentStep === 'message' && (
              <MessageStep design={design} setDesign={setDesign} />
            )}
            {currentStep === 'style' && (
              <StyleStep design={design} setDesign={setDesign} />
            )}
            {currentStep === 'preview' && (
              <PreviewStep
                design={design}
                previewUrl={previewUrl}
                isGenerating={isGenerating}
                onGenerate={handleGeneratePreview}
              />
            )}
            {currentStep === 'gift' && (
              <GiftStep isSending={isSending} onSend={handleSendGift} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 pt-6">
          {currentStepIndex > 0 && (
            <Button variant="outline" onClick={handlePrev} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
          {currentStepIndex < steps.length - 1 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 bg-pink-500 hover:bg-pink-600"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* Layout Selection Step */
function LayoutStep({ design, setDesign }: any) {
  const templates = lockscreenGiftService.layoutTemplates;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">Choose a Layout</h2>
        <p className="text-sm text-gray-600 mt-1">
          Pick the perfect style for your gift
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => (
          <button
            key={template.layout}
            onClick={() =>
              setDesign({ ...design, layout: template.layout, style: { ...design.style, ...template.defaultStyle } })
            }
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              design.layout === template.layout
                ? 'border-pink-500 bg-pink-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-2 flex items-center justify-center">
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-sm text-gray-800">{template.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
            {template.isPremium && (
              <span className="text-xs text-pink-600 font-medium mt-1 inline-block">
                Premium
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Images Step */
function ImagesStep({ design, setDesign }: any) {
  const handleImageUpload = (type: 'main' | 'secondary') => {
    // TODO: Implement actual image upload
    toast.info('Image upload coming soon!', {
      description: 'For now, using a placeholder',
    });

    const newImage: WallpaperImage = {
      id: Date.now().toString(),
      url: 'https://via.placeholder.com/400x600',
      type,
      position: type === 'secondary' ? { x: 20, y: 30 } : undefined,
      size: type === 'secondary' ? { width: 30, height: 20 } : undefined,
      frameStyle: 'polaroid',
    };

    setDesign({
      ...design,
      images: [...(design.images || []), newImage],
    });
  };

  const mainImage = design.images?.find((img: WallpaperImage) => img.type === 'main');
  const secondaryImages = design.images?.filter((img: WallpaperImage) => img.type === 'secondary') || [];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">Add Your Photos</h2>
        <p className="text-sm text-gray-600 mt-1">
          Choose the memories you want to share
        </p>
      </div>

      {/* Main Image */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Main Photo</h3>
        {mainImage ? (
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <img src={mainImage.url} alt="Main" className="w-full h-full object-cover" />
          </div>
        ) : (
          <button
            onClick={() => handleImageUpload('main')}
            className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-600">Upload photo</span>
          </button>
        )}
      </Card>

      {/* Secondary Images */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">
          Additional Photos (Optional)
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => {
            const image = secondaryImages[index];
            return (
              <div key={index}>
                {image ? (
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={image.url} alt={`Secondary ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <button
                    onClick={() => handleImageUpload('secondary')}
                    className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* Date Display Step */
function DateStep({ design, setDesign, relationship }: any) {
  const [showDate, setShowDate] = useState(design.dateDisplay?.show ?? true);
  const [dateFormat, setDateFormat] = useState(design.dateDisplay?.format ?? 'years_months');
  const [customText, setCustomText] = useState(design.dateDisplay?.customText ?? '');

  useEffect(() => {
    setDesign({
      ...design,
      relationshipStartDate: relationship?.connected_at || relationship?.created_at,
      dateDisplay: {
        show: showDate,
        format: dateFormat,
        customText: dateFormat === 'custom' ? customText : undefined,
        placement: 'top' as TextPlacement,
        color: '#ffffff',
        fontSize: 18,
      },
    });
  }, [showDate, dateFormat, customText]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">Relationship Date</h2>
        <p className="text-sm text-gray-600 mt-1">
          Celebrate your time together
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Show date</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showDate}
              onChange={(e) => setShowDate(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
          </label>
        </div>

        {showDate && (
          <>
            <div>
              <label className="text-sm text-gray-700 block mb-2">Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="full_date">Together since [Date]</option>
                <option value="days_together">Day X together</option>
                <option value="years_months">X years, X months</option>
                <option value="custom">Custom text</option>
              </select>
            </div>

            {dateFormat === 'custom' && (
              <div>
                <label className="text-sm text-gray-700 block mb-2">Custom text</label>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="2 years • 4 months • still choosing you"
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  maxLength={60}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {60 - customText.length} characters remaining
                </p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

/* Message Step */
function MessageStep({ design, setDesign }: any) {
  const [message, setMessage] = useState(design.message?.text ?? '');
  const [fontStyle, setFontStyle] = useState<FontStyle>(design.message?.fontStyle ?? 'clean');

  const maxLength = 100;

  useEffect(() => {
    if (message) {
      setDesign({
        ...design,
        message: {
          text: message,
          fontStyle,
          alignment: 'center',
          placement: 'bottom' as TextPlacement,
          color: '#ffffff',
          fontSize: 24,
          lineSpacing: 1.4,
        },
      });
    } else {
      const { message: _, ...rest } = design;
      setDesign(rest);
    }
  }, [message, fontStyle]);

  const examples = [
    "No matter the distance, it's always you.",
    "I carry you with me everywhere.",
    "Still falling for you.",
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">Add a Message</h2>
        <p className="text-sm text-gray-600 mt-1">
          A sweet note for your partner
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Your message</label>
            <span className="text-xs text-gray-500">{maxLength - message.length} left</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
            placeholder="Write something sweet..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-sm"
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm text-gray-700 block mb-2">Font style</label>
          <div className="grid grid-cols-2 gap-2">
            {(['clean', 'handwritten', 'romantic', 'bold'] as FontStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => setFontStyle(style)}
                className={`p-2 rounded-lg border-2 transition-all text-sm ${
                  fontStyle === style
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-700 block mb-2">Examples (tap to use)</label>
          <div className="space-y-1">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setMessage(ex)}
                className="w-full text-left p-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 italic"
              >
                "{ex}"
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* Style Step */
function StyleStep({ design, setDesign }: any) {
  const [moodPreset, setMoodPreset] = useState<MoodPreset>(design.style?.moodPreset ?? 'soft_romantic');

  const presets = lockscreenGiftService.moodPresets;

  useEffect(() => {
    const preset = presets.find((p) => p.preset === moodPreset);
    if (preset) {
      setDesign({
        ...design,
        style: {
          ...design.style,
          moodPreset,
          textColor: preset.colors.textColor,
          accentColor: preset.colors.accentColor,
        },
      });
    }
  }, [moodPreset]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">Choose a Mood</h2>
        <p className="text-sm text-gray-600 mt-1">
          Set the perfect atmosphere
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {presets.map((preset) => (
          <button
            key={preset.preset}
            onClick={() => setMoodPreset(preset.preset)}
            className={`p-4 rounded-xl border-2 transition-all ${
              moodPreset === preset.preset
                ? 'border-pink-500 bg-pink-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="text-3xl mb-2">{preset.emoji}</div>
            <h3 className="font-semibold text-sm text-gray-800">{preset.name}</h3>
            <div className="flex gap-1 mt-2">
              {[preset.colors.gradientStart, preset.colors.gradientEnd].map((color, i) => (
                <div
                  key={i}
                  className="h-3 flex-1 rounded"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Preview Step */
function PreviewStep({ design, previewUrl, isGenerating, onGenerate }: any) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">Preview Your Gift</h2>
        <p className="text-sm text-gray-600 mt-1">
          See how it will look
        </p>
      </div>

      {previewUrl ? (
        <Card className="p-3 bg-gray-100">
          <div className="aspect-[9/19.5] rounded-2xl overflow-hidden shadow-xl mx-auto max-w-[280px]">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-4">
            Generate a preview to see your wallpaper
          </p>
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Generate Preview
              </>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
}

/* Gift Step */
function GiftStep({ isSending, onSend }: any) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Gift className="w-10 h-10 text-pink-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Send Your Gift</h2>
        <p className="text-gray-600 mt-2">
          Your partner will receive a beautiful notification
        </p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 border-pink-100">
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
            <span>They'll see a special reveal animation</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
            <span>Can set it as their lockscreen in one tap</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
            <span>Saved to your shared memories forever</span>
          </div>
        </div>
      </Card>

      <Button
        onClick={onSend}
        disabled={isSending}
        className="w-full bg-pink-500 hover:bg-pink-600 h-12"
      >
        {isSending ? (
          <>
            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Sending Gift...
          </>
        ) : (
          <>
            <Gift className="w-4 h-4 mr-2" />
            Send Gift to Partner
          </>
        )}
      </Button>
    </div>
  );
}
