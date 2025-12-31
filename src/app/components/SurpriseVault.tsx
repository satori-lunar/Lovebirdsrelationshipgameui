import { useState } from 'react';
import { ChevronLeft, Lock, Plus, Check, Eye, EyeOff, Sparkles, Gift as GiftIcon, Calendar, Heart, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface SurpriseVaultProps {
  onBack: () => void;
  partnerName: string;
}

interface SecretSuggestion {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'gift' | 'date' | 'love_language' | 'custom';
  status: 'planning' | 'ready' | 'executed';
  is_secret: boolean;
  created_at: string;
  executed_at?: string;
}

export function SurpriseVault({ onBack, partnerName }: SurpriseVaultProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSurprise, setNewSurprise] = useState({
    title: '',
    description: '',
    category: 'gift' as const,
  });

  // Fetch secret suggestions
  const { data: secrets = [], isLoading } = useQuery({
    queryKey: ['secret-suggestions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await api.supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_secret', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Add new secret
  const addSecretMutation = useMutation({
    mutationFn: async (secret: typeof newSurprise) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await api.supabase
        .from('suggestions')
        .insert({
          user_id: user.id,
          category: secret.category,
          suggestion_text: secret.description,
          suggestion_type: secret.title,
          is_secret: true,
          saved: true,
          completed: false,
          metadata: { title: secret.title },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secret-suggestions'] });
      setShowAddForm(false);
      setNewSurprise({ title: '', description: '', category: 'gift' });
      toast.success('Secret surprise added to your vault! 🤫');
    },
    onError: (error) => {
      toast.error('Failed to add surprise');
      console.error('Error adding secret:', error);
    },
  });

  // Update secret status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await api.supabase
        .from('suggestions')
        .update({
          completed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secret-suggestions'] });
      toast.success('Secret updated! 🎉');
    },
  });

  // Delete secret
  const deleteSecretMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.supabase
        .from('suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secret-suggestions'] });
      toast.success('Secret removed from vault');
    },
  });

  // Make suggestion public (remove from vault)
  const makePublicMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.supabase
        .from('suggestions')
        .update({ is_secret: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secret-suggestions'] });
      toast.success('Moved to regular suggestions');
    },
  });

  const handleAddSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurprise.title.trim() || !newSurprise.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    addSecretMutation.mutate(newSurprise);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'gift':
        return GiftIcon;
      case 'date':
        return Calendar;
      case 'love_language':
        return Heart;
      default:
        return Sparkles;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gift':
        return 'from-pink-500 to-rose-500';
      case 'date':
        return 'from-purple-500 to-indigo-500';
      case 'love_language':
        return 'from-pink-500 to-purple-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6 pb-12 border-b border-gray-700">
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
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">Surprise Vault</h1>
                <p className="text-gray-400 text-sm">
                  Secret plans for {partnerName} 🤫
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              className="bg-gray-700 hover:bg-gray-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Info Card */}
        <Card className="p-4 mb-6 bg-gray-800 border-gray-700 text-white">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-1">100% Private</p>
              <p className="text-xs text-gray-400">
                These surprises are completely secret - {partnerName} will never see them.
                Perfect for planning gifts, dates, and special moments!
              </p>
            </div>
          </div>
        </Card>

        {/* Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="p-5 mb-6 bg-gray-800 border-gray-700">
                <form onSubmit={handleAddSecret} className="space-y-4">
                  <div>
                    <Label className="text-white">What's the surprise?</Label>
                    <Input
                      value={newSurprise.title}
                      onChange={(e) => setNewSurprise({ ...newSurprise, title: e.target.value })}
                      placeholder="Anniversary dinner, Custom bracelet..."
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Details</Label>
                    <Textarea
                      value={newSurprise.description}
                      onChange={(e) => setNewSurprise({ ...newSurprise, description: e.target.value })}
                      placeholder="Notes, ideas, where to buy, timing..."
                      rows={3}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Category</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['gift', 'date', 'love_language'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewSurprise({ ...newSurprise, category: cat })}
                          className={`p-2 rounded-lg border text-xs capitalize ${
                            newSurprise.category === cat
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-gray-900 border-gray-700 text-gray-400'
                          }`}
                        >
                          {cat.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addSecretMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Add to Vault
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Secrets List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-8 text-center bg-gray-800 border-gray-700">
              <p className="text-gray-400">Loading your secrets...</p>
            </Card>
          ) : secrets.length === 0 ? (
            <Card className="p-8 text-center bg-gray-800 border-gray-700">
              <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">Your vault is empty</p>
              <p className="text-sm text-gray-500 mb-4">
                Start planning secret surprises for {partnerName}!
              </p>
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Secret
              </Button>
            </Card>
          ) : (
            secrets.map((secret) => {
              const IconComponent = getCategoryIcon(secret.category);
              const gradientColor = getCategoryColor(secret.category);

              return (
                <Card key={secret.id} className="p-5 bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${gradientColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">
                            {secret.metadata?.title || secret.suggestion_type}
                          </h3>
                          <p className="text-sm text-gray-400 mb-3">
                            {secret.suggestion_text}
                          </p>
                        </div>
                        {secret.completed && (
                          <div className="flex items-center gap-1 text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded-full ml-2">
                            <Check className="w-3 h-3" />
                            Done
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full capitalize">
                          {secret.category}
                        </span>
                        <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Secret
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: secret.id, completed: !secret.completed })}
                          size="sm"
                          className={`flex-1 text-xs ${
                            secret.completed
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          {secret.completed ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Executed!
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Mark Done
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => deleteSecretMutation.mutate(secret.id)}
                          size="sm"
                          variant="outline"
                          className="bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
