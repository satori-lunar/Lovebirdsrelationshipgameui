import { useState } from 'react';
import { ChevronLeft, Camera, Plus, Image as ImageIcon, Heart, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface MemoriesProps {
  onBack: () => void;
}

interface Memory {
  id: string;
  photoUrl?: string;
  journalEntry?: string;
  tags: string[];
  memoryDate: string;
  isPrivate: boolean;
}

export function Memories({ onBack }: MemoriesProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [newMemory, setNewMemory] = useState({
    journalEntry: '',
    tags: '',
    memoryDate: new Date().toISOString().split('T')[0],
    isPrivate: false,
  });

  const handleAddMemory = () => {
    if (newMemory.journalEntry.trim() || newMemory.tags.trim() || selectedImage) {
      const memory: Memory = {
        id: Date.now().toString(),
        photoUrl: selectedImage ? URL.createObjectURL(selectedImage) : undefined,
        journalEntry: newMemory.journalEntry || undefined,
        tags: newMemory.tags.split(',').map(t => t.trim()).filter(Boolean),
        memoryDate: newMemory.memoryDate,
        isPrivate: newMemory.isPrivate,
      };
      setMemories([memory, ...memories]);
      setNewMemory({
        journalEntry: '',
        tags: '',
        memoryDate: new Date().toISOString().split('T')[0],
        isPrivate: false,
      });
      setSelectedImage(null);
      setIsAddingMemory(false);
    }
  };

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
          
          <div className="flex items-center justify-between mb-2">
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add a Memory</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
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
                    <Label htmlFor="memory-tags">Tags (comma separated)</Label>
                    <Input
                      id="memory-tags"
                      value={newMemory.tags}
                      onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
                      placeholder="First date, Anniversary, Vacation..."
                    />
                  </div>
                  <Button
                    onClick={handleAddMemory}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                  >
                    Save Memory
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {memories.length === 0 ? (
          <Card className="p-12 border-0 shadow-lg text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 text-pink-500" />
            </div>
            <h2 className="text-2xl mb-3">Start Saving Memories</h2>
            <p className="text-gray-600 mb-6">
              Capture your special moments together. Add photos, write journal entries, and tag your favorite memories.
            </p>
            <Button
              onClick={() => setIsAddingMemory(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Memory
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {memories.map((memory) => (
              <Card key={memory.id} className="p-6 border-0 shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {new Date(memory.memoryDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    {memory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {memory.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {memory.journalEntry && (
                  <p className="text-gray-700 leading-relaxed mb-4">{memory.journalEntry}</p>
                )}
                {memory.photoUrl && (
                  <div className="rounded-xl overflow-hidden mb-4">
                    <img
                      src={memory.photoUrl}
                      alt="Memory"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}
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
    </div>
  );
}
