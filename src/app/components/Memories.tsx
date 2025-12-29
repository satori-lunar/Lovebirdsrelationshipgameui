import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Camera, Plus, Image as ImageIcon, Heart, Tag, Search, Filter, Calendar, X, Edit3, Trash2, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useRelationship } from '../hooks/useRelationship';
import { memoryService, type Memory } from '../services/memoryService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Check if device has camera capabilities
const hasCameraSupport = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768 && window.innerHeight <= 1024);
};

interface MemoriesProps {
  onBack: () => void;
}

// Memory categories with display names and colors
const MEMORY_CATEGORIES = {
  date_night: { label: 'Date Night', color: 'bg-pink-100 text-pink-700' },
  milestone: { label: 'Milestone', color: 'bg-purple-100 text-purple-700' },
  trip: { label: 'Trip', color: 'bg-blue-100 text-blue-700' },
  everyday_moment: { label: 'Everyday Moment', color: 'bg-green-100 text-green-700' },
  growth_moment: { label: 'Growth Moment', color: 'bg-orange-100 text-orange-700' },
  celebration: { label: 'Celebration', color: 'bg-yellow-100 text-yellow-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700' }
} as const;

export function Memories({ onBack }: MemoriesProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const queryClient = useQueryClient();

  // State for memory creation
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [newMemory, setNewMemory] = useState({
    title: '',
    journalEntry: '',
    tags: [] as string[],
    customTag: '',
    memoryDate: new Date().toISOString().split('T')[0],
    isPrivate: false,
  });

  // State for viewing and filtering
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');

  // State for post-save confirmation
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [savedMemoryInfo, setSavedMemoryInfo] = useState<{
    memory: Memory;
    timeGroup: string;
    category: string;
    tags: string[];
  } | null>(null);

  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch memories
  const { data: memories = [], isLoading: memoriesLoading } = useQuery({
    queryKey: ['memories', relationship?.id, user?.id],
    queryFn: () => memoryService.getMemories(relationship!.id, user!.id),
    enabled: !!relationship?.id && !!user?.id,
  });

  // Create memory mutation
  const createMemoryMutation = useMutation({
    mutationFn: async (data: typeof newMemory & { photoUrl?: string }) => {
      if (!relationship?.id || !user?.id) throw new Error('Missing relationship or user');

      let photoUrl: string | undefined;
      if (selectedImage) {
        photoUrl = await memoryService.uploadPhoto(selectedImage, user.id, relationship.id);
      }

      return memoryService.createMemory(relationship.id, user.id, {
        title: data.title,
        photoUrl,
        journalEntry: data.journalEntry || undefined,
        tags: data.tags,
        isPrivate: data.isPrivate,
        memoryDate: data.memoryDate,
      });
    },
    onSuccess: (createdMemory) => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });

      // Calculate where this memory was organized
      const grouped = memoryService.groupMemoriesByTime([createdMemory]);
      const timeGroup = Object.keys(grouped)[0];
      const category = MEMORY_CATEGORIES[createdMemory.category as keyof typeof MEMORY_CATEGORIES]?.label || createdMemory.category || 'Other';

      setSavedMemoryInfo({
        memory: createdMemory,
        timeGroup,
        category,
        tags: createdMemory.tags
      });
      setShowSaveConfirmation(true);

      // Reset form
      setIsAddingMemory(false);
      setSelectedImage(null);
      setNewMemory({
        title: '',
        journalEntry: '',
        tags: [],
        customTag: '',
        memoryDate: new Date().toISOString().split('T')[0],
        isPrivate: false,
      });
    },
    onError: (error) => {
      console.error('Failed to save memory:', error);
      toast.error('Failed to save memory. Please try again.');
    },
  });

  // Update memory mutation
  const updateMemoryMutation = useMutation({
    mutationFn: (data: { memoryId: string; updates: Partial<Memory> }) =>
      memoryService.updateMemory(data.memoryId, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      toast.success('Memory updated!');
    },
  });

  // Delete memory mutation
  const deleteMemoryMutation = useMutation({
    mutationFn: (memoryId: string) => memoryService.deleteMemory(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      setSelectedMemory(null);
      toast.success('Memory deleted');
    },
  });

  // Handle memory creation
  const handleAddMemory = () => {
    if (!newMemory.title.trim()) {
      toast.error('Please add a title for your memory');
      return;
    }

    createMemoryMutation.mutate({
      ...newMemory,
      journalEntry: newMemory.journalEntry.trim() || undefined,
    });
  };

  // Handle tag suggestions
  const handleTagSuggestions = () => {
    const suggestions = memoryService.suggestTags(
      newMemory.title,
      newMemory.journalEntry,
      newMemory.tags
    );
    const newTags = [...new Set([...newMemory.tags, ...suggestions])];
    setNewMemory(prev => ({ ...prev, tags: newTags }));
  };

  // Handle adding custom tag
  const handleAddCustomTag = () => {
    if (newMemory.customTag.trim() && !newMemory.tags.includes(newMemory.customTag.trim())) {
      setNewMemory(prev => ({
        ...prev,
        tags: [...prev.tags, prev.customTag.trim()],
        customTag: ''
      }));
    }
  };

  // Handle removing tag
  const handleRemoveTag = (tagToRemove: string) => {
    setNewMemory(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Filter and search memories
  const filteredMemories = memories.filter(memory => {
    const matchesSearch = searchQuery === '' ||
      memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.journal_entry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === 'all' || memory.category === filterCategory;
    const matchesTag = filterTag === 'all' || memory.tags.includes(filterTag);

    return matchesSearch && matchesCategory && matchesTag;
  });

  // Group memories by time for timeline view
  const groupedMemories = memoryService.groupMemoriesByTime(filteredMemories);

  // Get all unique tags for filtering
  const allTags = Array.from(new Set(memories.flatMap(memory => memory.tags))).sort();

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">Memories</h1>
                <p className="text-white/90 text-sm">
                  {memories.length} {memories.length === 1 ? 'memory' : 'memories'} saved
                </p>
              </div>
            </div>
            <Dialog open={isAddingMemory} onOpenChange={setIsAddingMemory}>
              <DialogTrigger asChild>
            <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                  <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add a Memory</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="memory-title">Title *</Label>
                    <Input
                      id="memory-title"
                      value={newMemory.title}
                      onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                      placeholder="Give this memory a title..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="memory-date">Date</Label>
                    <Input
                      id="memory-date"
                      type="date"
                      value={newMemory.memoryDate}
                      onChange={(e) => setNewMemory({ ...newMemory, memoryDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="memory-entry">Journal Entry</Label>
                    <Textarea
                      id="memory-entry"
                      value={newMemory.journalEntry}
                      onChange={(e) => setNewMemory({ ...newMemory, journalEntry: e.target.value })}
                      placeholder="Write about this special moment..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tags</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleTagSuggestions}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        💡 Suggest tags
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newMemory.customTag}
                        onChange={(e) => setNewMemory({ ...newMemory, customTag: e.target.value })}
                        placeholder="Add a tag..."
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddCustomTag}
                        disabled={!newMemory.customTag.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    {newMemory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newMemory.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="cursor-pointer hover:bg-red-100 hover:text-red-700"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Add a Photo</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <ImageIcon className="w-4 h-4" />
                        Choose Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={`flex items-center gap-2 ${!hasCameraSupport() ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!hasCameraSupport()}
                        onClick={() => {
                          if (!hasCameraSupport()) {
                            toast.info('Camera not available on this device');
                            return;
                          }
                          cameraInputRef.current?.click();
                        }}
                      >
                        <Camera className="w-4 h-4" />
                        Take Photo
                      </Button>
                    </div>
                    {!hasCameraSupport() && (
                      <p className="text-xs text-gray-500">
                        💡 Camera not available on this device. Use "Choose Photo" to select from gallery.
                      </p>
                    )}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedImage(file);
                          toast.success('Photo selected!');
                        }
                      }}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture={isMobileDevice() ? "environment" : undefined}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedImage(file);
                          toast.success('Photo captured!');
                        }
                      }}
                      className="hidden"
                    />
                    {selectedImage && (
                      <div className="mt-2">
                        <img
                          src={URL.createObjectURL(selectedImage)}
                          alt="Selected"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleAddMemory}
                    disabled={createMemoryMutation.isPending}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                  >
                    {createMemoryMutation.isPending ? 'Saving...' : 'Save Memory'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      {memories.length > 0 && (
        <div className="max-w-md mx-auto px-6 -mt-2 mb-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-white"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(MEMORY_CATEGORIES).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-white"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                  className="flex-1"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Timeline
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="flex-1"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Grid
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-6 -mt-6">
        {memoriesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 border-0 shadow-md">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-32 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredMemories.length === 0 ? (
          <Card className="p-12 border-0 shadow-lg text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 text-pink-500" />
            </div>
            <h2 className="text-2xl mb-3">
              {memories.length === 0 ? 'Start Saving Memories' : 'No memories found'}
            </h2>
            <p className="text-gray-600 mb-6">
              {memories.length === 0
                ? 'Capture your special moments together. Add photos, write journal entries, and tag your favorite memories.'
                : 'Try adjusting your search or filters to find what you\'re looking for.'
              }
            </p>
            {memories.length === 0 && (
              <Button
                onClick={() => setIsAddingMemory(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Memory
              </Button>
            )}
          </Card>
        ) : viewMode === 'timeline' ? (
          <div className="space-y-6">
            {Object.entries(groupedMemories).map(([timeGroup, groupMemories]) => (
              <div key={timeGroup}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 px-2">{timeGroup}</h3>
                <div className="space-y-3">
                  {groupMemories.map((memory) => (
                    <Card
                      key={memory.id}
                      className="p-4 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedMemory(memory)}
                    >
                      <div className="flex gap-3">
                        {memory.photo_url ? (
                          <img
                            src={memory.photo_url}
                            alt={memory.title}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Camera className="w-6 h-6 text-pink-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{memory.title}</h4>
                          <p className="text-sm text-gray-500 mb-1">
                            {new Date(memory.memory_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: memory.memory_date.includes(new Date().getFullYear().toString()) ? undefined : 'numeric'
                            })}
                          </p>
                          {memory.journal_entry && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {memory.journal_entry}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {memory.category && (
                              <Badge
                                variant="secondary"
                                className={`text-xs ${MEMORY_CATEGORIES[memory.category as keyof typeof MEMORY_CATEGORIES]?.color || 'bg-gray-100 text-gray-700'}`}
                              >
                                {MEMORY_CATEGORIES[memory.category as keyof typeof MEMORY_CATEGORIES]?.label || memory.category}
                              </Badge>
                            )}
                            {memory.tags.slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {memory.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{memory.tags.length - 2} more</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Grid view
          <div className="grid grid-cols-2 gap-3">
            {filteredMemories.map((memory) => (
              <Card
                key={memory.id}
                className="p-3 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedMemory(memory)}
              >
                {memory.photo_url ? (
                  <img
                    src={memory.photo_url}
                    alt={memory.title}
                    className="w-full h-24 rounded-lg object-cover mb-2"
                  />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg flex items-center justify-center mb-2">
                    <Camera className="w-5 h-5 text-pink-500" />
                  </div>
                )}
                <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{memory.title}</h4>
                <p className="text-xs text-gray-500">
                  {new Date(memory.memory_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="p-5 mt-6 bg-gradient-to-r from-pink-50 to-purple-50 border-0">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1 text-sm">Your Private Scrapbook</h3>
              <p className="text-xs text-gray-600">
                Unlike social media, this is just for you two. No likes, no comments, no pressure - just your authentic moments together.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <Dialog open={!!selectedMemory} onOpenChange={() => setSelectedMemory(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedMemory.title}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement edit functionality
                      toast.info('Edit functionality coming soon!');
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this memory?')) {
                        deleteMemoryMutation.mutate(selectedMemory.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {selectedMemory.photo_url && (
                <img
                  src={selectedMemory.photo_url}
                  alt={selectedMemory.title}
                  className="w-full rounded-lg object-cover"
                />
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedMemory.memory_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>

                {selectedMemory.category && (
                  <Badge
                    variant="secondary"
                    className={MEMORY_CATEGORIES[selectedMemory.category as keyof typeof MEMORY_CATEGORIES]?.color || 'bg-gray-100 text-gray-700'}
                  >
                    {MEMORY_CATEGORIES[selectedMemory.category as keyof typeof MEMORY_CATEGORIES]?.label || selectedMemory.category}
                  </Badge>
                )}
              </div>

              {selectedMemory.journal_entry && (
                <div className="space-y-2">
                  <h4 className="font-medium">Journal Entry</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedMemory.journal_entry}
                  </p>
                </div>
              )}

              {selectedMemory.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemory.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Post-Save Confirmation Dialog */}
      {showSaveConfirmation && savedMemoryInfo && (
        <Dialog open={showSaveConfirmation} onOpenChange={setShowSaveConfirmation}>
          <DialogContent className="max-w-sm">
            <div className="text-center space-y-4 pt-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Memory Saved! 🎉</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your memory has been organized and saved to your timeline.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    ORGANIZED IN
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Time Group:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {savedMemoryInfo.timeGroup}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Category:</span>
                      <Badge
                        variant="secondary"
                        className={MEMORY_CATEGORIES[savedMemoryInfo.memory.category as keyof typeof MEMORY_CATEGORIES]?.color || 'bg-gray-100 text-gray-700'}
                      >
                        {savedMemoryInfo.category}
                      </Badge>
                    </div>

                    {savedMemoryInfo.tags.length > 0 && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600">Tags:</span>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                          {savedMemoryInfo.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {savedMemoryInfo.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{savedMemoryInfo.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveConfirmation(false);
                    setSavedMemoryInfo(null);
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowSaveConfirmation(false);
                    setSavedMemoryInfo(null);
                    setSelectedMemory(savedMemoryInfo.memory);
                  }}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                >
                  View Memory
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
