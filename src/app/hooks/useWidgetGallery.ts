import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { widgetService } from '../services/widgetService';
import type { MemoryWidgetData } from '../types/widget';

const MAX_SELECTED_MEMORIES = 5;

/**
 * Hook for managing the Widget Gallery
 *
 * Provides:
 * - List of memories with photos (widget-ready)
 * - Selection state management
 * - Save to widget functionality
 */
export function useWidgetGallery(relationshipId: string | undefined, userId: string | undefined) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Fetch all memories with photos
  const {
    data: memories = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['widget-memories', relationshipId],
    queryFn: () => widgetService.getWidgetReadyMemories(relationshipId!, userId!),
    enabled: !!relationshipId && !!userId
  });

  // Load saved configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await widgetService.getWidgetConfig();
        if (config) {
          // Only set IDs that still exist in the memories list
          setSelectedIds(prevIds => {
            const validIds = config.selectedMemoryIds.filter(id =>
              memories.some(m => m.id === id)
            );
            return validIds;
          });
        }
      } catch (err) {
        console.error('[useWidgetGallery] Failed to load config:', err);
      } finally {
        setConfigLoaded(true);
      }
    };

    if (memories.length > 0 && !configLoaded) {
      loadConfig();
    }
  }, [memories, configLoaded]);

  // Toggle memory selection (max 5)
  const toggleMemory = useCallback((memoryId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(memoryId)) {
        // Deselect
        return prev.filter(id => id !== memoryId);
      }
      if (prev.length >= MAX_SELECTED_MEMORIES) {
        // Already at max, don't add more
        return prev;
      }
      // Select
      return [...prev, memoryId];
    });
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Select all (up to max)
  const selectAll = useCallback(() => {
    const idsToSelect = memories.slice(0, MAX_SELECTED_MEMORIES).map(m => m.id);
    setSelectedIds(idsToSelect);
  }, [memories]);

  // Save to widget mutation
  const saveToWidgetMutation = useMutation({
    mutationFn: async () => {
      await widgetService.syncToWidget(selectedIds, memories);
      await widgetService.saveWidgetConfig({
        selectedMemoryIds: selectedIds,
        currentIndex: 0,
        lastRotated: new Date().toISOString(),
        rotationMode: 'daily'
      });
    },
    onSuccess: () => {
      console.log('[useWidgetGallery] Widget configuration saved successfully');
    },
    onError: (error) => {
      console.error('[useWidgetGallery] Failed to save widget config:', error);
    }
  });

  // Get selected memories in order
  const selectedMemories: MemoryWidgetData[] = selectedIds
    .map(id => memories.find(m => m.id === id))
    .filter((m): m is MemoryWidgetData => m !== undefined);

  // Get the first selected memory for preview
  const previewMemory = selectedMemories[0] ?? null;

  return {
    // Data
    memories,
    selectedIds,
    selectedMemories,
    previewMemory,

    // Loading states
    isLoading,
    isConfigLoaded: configLoaded,
    isSaving: saveToWidgetMutation.isPending,
    error,

    // Actions
    toggleMemory,
    clearSelection,
    selectAll,
    saveToWidget: saveToWidgetMutation.mutate,
    refetch,

    // Computed
    canSave: selectedIds.length > 0,
    selectionCount: selectedIds.length,
    maxSelections: MAX_SELECTED_MEMORIES,
    isAtMax: selectedIds.length >= MAX_SELECTED_MEMORIES,

    // Widget availability
    isWidgetAvailable: widgetService.isWidgetAvailable()
  };
}
