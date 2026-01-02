import { useState } from 'react';
import { ChevronLeft, Check, Image as ImageIcon, Info, Smartphone, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useRelationship } from '../hooks/useRelationship';
import { useWidgetGallery } from '../hooks/useWidgetGallery';

interface WidgetGalleryProps {
  onBack: () => void;
}

export function WidgetGallery({ onBack }: WidgetGalleryProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [showInstructions, setShowInstructions] = useState(false);

  const {
    memories,
    selectedIds,
    previewMemory,
    isLoading,
    isSaving,
    toggleMemory,
    clearSelection,
    saveToWidget,
    canSave,
    selectionCount,
    maxSelections,
    isAtMax,
    isWidgetAvailable
  } = useWidgetGallery(relationship?.id, user?.id);

  const handleSave = () => {
    saveToWidget(undefined, {
      onSuccess: () => {
        toast.success('Widget updated!', {
          description: 'Your selected memories have been saved to the widget.'
        });
        setShowInstructions(true);
      },
      onError: () => {
        toast.error('Failed to save', {
          description: 'Please try again.'
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="p-4">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-pink-500" />
          </div>
        </div>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="p-4">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No Photo Memories Yet
            </h3>
            <p className="text-gray-500 text-sm max-w-xs mb-6">
              Add some memories with photos to create your home screen widget!
            </p>
            <Button onClick={onBack}>
              Go to Memories
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-800">Widget Gallery</h1>
          </div>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>

        {/* Subtitle */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Select up to {maxSelections} memories for your home screen widget
          </p>
          <p className="text-pink-600 font-medium mt-1">
            {selectionCount} of {maxSelections} selected
          </p>
        </div>

        {/* Memory Grid */}
        <div className="grid grid-cols-3 gap-2">
          {memories.map(memory => {
            const isSelected = selectedIds.includes(memory.id);
            const selectionIndex = selectedIds.indexOf(memory.id);

            return (
              <motion.button
                key={memory.id}
                onClick={() => toggleMemory(memory.id)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-pink-500 ring-2 ring-pink-200 scale-[0.98]'
                    : 'border-transparent hover:border-pink-200'
                } ${!isSelected && isAtMax ? 'opacity-50' : ''}`}
                whileTap={{ scale: 0.95 }}
                disabled={!isSelected && isAtMax}
              >
                <img
                  src={memory.photoUrl}
                  alt={memory.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Selection indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-1.5 right-1.5 bg-pink-500 rounded-full w-6 h-6 flex items-center justify-center shadow-md"
                    >
                      <span className="text-white text-xs font-bold">
                        {selectionIndex + 1}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 pt-6">
                  <p className="text-white text-xs font-medium truncate">
                    {memory.title}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Widget Preview */}
        <AnimatePresence>
          {previewMemory && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Widget Preview</h3>
                {selectionCount > 1 && (
                  <span className="text-xs text-gray-500">
                    Rotates daily through {selectionCount} memories
                  </span>
                )}
              </div>

              <Card className="p-3 bg-gray-100 max-w-[220px] mx-auto shadow-lg">
                <div className="aspect-square rounded-xl overflow-hidden mb-2">
                  <img
                    src={previewMemory.photoUrl}
                    alt={previewMemory.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-medium text-sm text-gray-800 truncate">
                  {previewMemory.title}
                </p>
                {previewMemory.note && (
                  <p className="text-xs text-gray-600 line-clamp-2 mt-0.5 italic">
                    "{previewMemory.note}"
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {previewMemory.date}
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="w-full bg-pink-500 hover:bg-pink-600"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 mr-2" />
                Save to Widget
              </>
            )}
          </Button>

          {selectionCount > 0 && (
            <Button
              variant="outline"
              onClick={clearSelection}
              className="w-full"
            >
              Clear Selection
            </Button>
          )}
        </div>

        {/* Instructions */}
        <AnimatePresence>
          {(showInstructions || !isWidgetAvailable) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-blue-50 border-blue-100 p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">How to add the widget:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700">
                      <li>Go to your home screen</li>
                      <li>Long press on an empty area</li>
                      <li>Tap "Add Widget" or "+"</li>
                      <li>Find "Lovebirds" and select size</li>
                      <li>Place the widget on your screen</li>
                    </ol>
                    {!isWidgetAvailable && (
                      <p className="mt-3 text-blue-600 text-xs">
                        Note: Widget requires the native app. Web preview only.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info about widget behavior */}
        <div className="text-center text-xs text-gray-400 pb-4">
          <p>Your widget will automatically show a new memory each day</p>
          <p>Tap the widget to open that memory in the app</p>
        </div>
      </div>
    </div>
  );
}
