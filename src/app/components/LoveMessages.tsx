import { useState } from 'react';
import { ChevronLeft, Heart, Send, MessageCircle, Sparkles, Check, X, Reply, ThumbsUp, Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { dragonGameLogic } from '../services/dragonGameLogic';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { AISuggestions } from './AISuggestions';
import type { AISuggestion } from '../services/aiSuggestionService';

interface LoveMessagesProps {
  onBack: () => void;
}

interface PartnerMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  message_type: 'message' | 'miss_you' | 'thinking_of_you' | 'love_note' | 'compliment';
  read: boolean;
  created_at: string;
  read_at?: string;
  reply_to_id?: string | null;
  is_saved?: boolean;
  saved_at?: string | null;
}

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: 'love' | 'like' | 'laugh' | 'celebrate' | 'support';
  created_at: string;
}

const MESSAGE_TEMPLATES = {
  miss_you: [
    "Missing you right now 💕",
    "Can't wait to see you again!",
    "Thinking about you and smiling",
    "Wish you were here with me",
  ],
  thinking_of_you: [
    "Just wanted to say I'm thinking of you ❤️",
    "You crossed my mind and made me smile",
    "Hope you're having a great day!",
    "Sending you positive vibes!",
  ],
  love_note: [
    "You make my life so much better 💗",
    "I'm so grateful to have you",
    "You're my favorite person",
    "Love you more every day",
  ],
  compliment: [
    "You looked amazing today!",
    "I love how thoughtful you are",
    "Your smile brightens my day",
    "You're incredibly talented",
  ],
};

export function LoveMessages({ onBack }: LoveMessagesProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const { partnerName } = usePartnerOnboarding();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [selectedType, setSelectedType] = useState<'custom' | keyof typeof MESSAGE_TEMPLATES>('custom');
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'received' | 'sent'>('send');
  const [replyingTo, setReplyingTo] = useState<PartnerMessage | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({});

  // Fetch messages
  const { data: receivedMessages = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['messages', 'received', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await api.supabase
        .from('partner_messages')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: sentMessages = [], isLoading: loadingSent } = useQuery({
    queryKey: ['messages', 'sent', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await api.supabase
        .from('partner_messages')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch reactions for all messages
  const { data: reactions = [] } = useQuery({
    queryKey: ['message-reactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await api.supabase
        .from('message_reactions')
        .select('*')
        .or(`user_id.eq.${user.id},message_id.in.(${[...receivedMessages, ...sentMessages].map(m => m.id).join(',')})`);

      if (error) throw error;

      // Group reactions by message_id
      const grouped: Record<string, MessageReaction[]> = {};
      (data || []).forEach((reaction: MessageReaction) => {
        if (!grouped[reaction.message_id]) {
          grouped[reaction.message_id] = [];
        }
        grouped[reaction.message_id].push(reaction);
      });
      setMessageReactions(grouped);
      return data || [];
    },
    enabled: !!user?.id && (receivedMessages.length > 0 || sentMessages.length > 0),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, type, replyToId }: { text: string; type: string; replyToId?: string }) => {
      if (!user?.id || !partnerId) throw new Error('Not authenticated');

      const { data, error } = await api.supabase
        .from('partner_messages')
        .insert({
          sender_id: user.id,
          receiver_id: partnerId,
          message_text: text,
          message_type: type,
          reply_to_id: replyToId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (messageData) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageText('');
      setSelectedType('custom');
      setShowTemplates(false);
      setReplyingTo(null);
      toast.success('Message sent! 💌');

      // Award dragon XP for sending message
      if (user?.id && messageData?.id) {
        try {
          const reward = await dragonGameLogic.awardActivityCompletion(
            user.id,
            'message_sent',
            messageData.id
          );
          if (reward.xp > 0) {
            toast.success(`🐉 +${reward.xp} Dragon XP!`, { duration: 3000 });
            if (reward.items.length > 0) {
              const itemNames = reward.items.map(i => i.itemId.replace('_', ' ')).join(', ');
              toast.success(`🎁 Got: ${itemNames}`, { duration: 3000 });
            }
            if (reward.evolved) {
              toast.success('🎉 Your dragon evolved!', { duration: 5000 });
            }
          }
        } catch (err) {
          console.error('Failed to award dragon XP:', err);
        }
      }
    },
    onError: (error) => {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await api.supabase
        .from('partner_messages')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'received'] });
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, reactionType }: { messageId: string; reactionType: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if user already reacted
      const existingReaction = messageReactions[messageId]?.find(r => r.user_id === user.id);

      if (existingReaction) {
        // If same reaction, remove it
        if (existingReaction.reaction_type === reactionType) {
          const { error } = await api.supabase
            .from('message_reactions')
            .delete()
            .eq('id', existingReaction.id);
          if (error) throw error;
          return;
        } else {
          // Update to new reaction
          const { error } = await api.supabase
            .from('message_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
          if (error) throw error;
          return;
        }
      }

      // Add new reaction
      const { error } = await api.supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-reactions'] });
    },
  });

  // Save/unsave message mutation
  const saveMessageMutation = useMutation({
    mutationFn: async ({ messageId, save }: { messageId: string; save: boolean }) => {
      const { error } = await api.supabase
        .from('partner_messages')
        .update({
          is_saved: save,
          saved_at: save ? new Date().toISOString() : null,
        })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message saved!');
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      toast.error('Please write a message');
      return;
    }

    sendMessageMutation.mutate({
      text: messageText,
      type: selectedType === 'custom' ? 'message' : selectedType,
      replyToId: replyingTo?.id,
    });
  };

  const handleReply = (message: PartnerMessage) => {
    setReplyingTo(message);
    setActiveTab('send');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReaction = (messageId: string, reactionType: 'love' | 'like') => {
    addReactionMutation.mutate({ messageId, reactionType });
  };

  const handleSaveMessage = (messageId: string, currentlySaved: boolean) => {
    saveMessageMutation.mutate({ messageId, save: !currentlySaved });
  };

  const getReactionEmoji = (type: string) => {
    switch (type) {
      case 'love': return '❤️';
      case 'like': return '👍';
      case 'laugh': return '😄';
      case 'celebrate': return '🎉';
      case 'support': return '🫂';
      default: return '👍';
    }
  };

  const getMessageReactions = (messageId: string) => {
    return messageReactions[messageId] || [];
  };

  const hasUserReacted = (messageId: string, reactionType: string) => {
    return getMessageReactions(messageId).some(r => r.user_id === user?.id && r.reaction_type === reactionType);
  };

  const handleTemplateSelect = (template: string) => {
    setMessageText(template);
    setShowTemplates(false);
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'miss_you':
        return '💕';
      case 'thinking_of_you':
        return '❤️';
      case 'love_note':
        return '💗';
      case 'compliment':
        return '✨';
      default:
        return '💌';
    }
  };

  const unreadCount = receivedMessages.filter(m => !m.read).length;

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
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">Love Messages</h1>
                <p className="text-white/90 text-sm">
                  Send sweet notes to {partnerName || 'your partner'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'send'
                ? 'bg-white text-pink-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Send
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all relative ${
              activeTab === 'received'
                ? 'bg-white text-pink-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <MessageCircle className="w-4 h-4 inline mr-2" />
            Received
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'sent'
                ? 'bg-white text-pink-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <Check className="w-4 h-4 inline mr-2" />
            Sent
          </button>
        </div>

        {/* Send Tab */}
        {activeTab === 'send' && (
          <div className="space-y-4">
            {/* Replying To Indicator */}
            {replyingTo && (
              <Card className="p-4 border-0 shadow-lg bg-blue-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Reply className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Replying to:</span>
                    </div>
                    <p className="text-sm text-gray-700 italic line-clamp-2">{replyingTo.message_text}</p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </Card>
            )}

            {/* AI Suggestions */}
            <AISuggestions
              type="message"
              title="AI Message Ideas"
              onSelect={(suggestion: AISuggestion) => {
                setMessageText(suggestion.text);
              }}
              compact
            />

            <Card className="p-5 border-0 shadow-lg">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Quick Templates
              </h3>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => {
                    setSelectedType('miss_you');
                    setShowTemplates(true);
                  }}
                  className="p-3 border-2 border-pink-200 rounded-lg hover:bg-pink-50 transition-colors text-sm"
                >
                  💕 Miss You
                </button>
                <button
                  onClick={() => {
                    setSelectedType('thinking_of_you');
                    setShowTemplates(true);
                  }}
                  className="p-3 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                >
                  ❤️ Thinking of You
                </button>
                <button
                  onClick={() => {
                    setSelectedType('love_note');
                    setShowTemplates(true);
                  }}
                  className="p-3 border-2 border-pink-200 rounded-lg hover:bg-pink-50 transition-colors text-sm"
                >
                  💗 Love Note
                </button>
                <button
                  onClick={() => {
                    setSelectedType('compliment');
                    setShowTemplates(true);
                  }}
                  className="p-3 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                >
                  ✨ Compliment
                </button>
              </div>

              {showTemplates && selectedType !== 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-4 bg-gray-50 rounded-lg"
                >
                  <p className="text-sm text-gray-600 mb-2">Pick a template:</p>
                  <div className="space-y-2">
                    {MESSAGE_TEMPLATES[selectedType].map((template, i) => (
                      <button
                        key={i}
                        onClick={() => handleTemplateSelect(template)}
                        className="w-full text-left p-2 bg-white rounded border hover:border-pink-300 hover:bg-pink-50 transition-colors text-sm"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="mb-4">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write your own message or pick a template above..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || !messageText.trim()}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </Card>

            <Card className="p-4 border-0 shadow-lg bg-pink-50">
              <p className="text-sm text-gray-700">
                <strong>💡 Tip:</strong> Random sweet messages throughout the day can really brighten your partner's mood!
              </p>
            </Card>
          </div>
        )}

        {/* Received Tab */}
        {activeTab === 'received' && (
          <div className="space-y-3">
            {loadingReceived ? (
              <Card className="p-8 text-center border-0 shadow-lg">
                <p className="text-gray-500">Loading messages...</p>
              </Card>
            ) : receivedMessages.length === 0 ? (
              <Card className="p-8 text-center border-0 shadow-lg">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No messages yet</p>
                <p className="text-sm text-gray-400">
                  {partnerName || 'Your partner'} hasn't sent you any messages yet
                </p>
              </Card>
            ) : (
              receivedMessages.map((message) => {
                const reactions = getMessageReactions(message.id);
                const userLoved = hasUserReacted(message.id, 'love');
                const userLiked = hasUserReacted(message.id, 'like');

                return (
                  <Card
                    key={message.id}
                    className={`p-4 border-0 shadow-lg transition-all ${
                      !message.read ? 'bg-pink-50 border-l-4 border-pink-500' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getMessageIcon(message.message_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-600">
                            From {partnerName || 'Your partner'}
                          </p>
                          <div className="flex items-center gap-2">
                            {!message.read && (
                              <span className="text-xs bg-pink-500 text-white px-2 py-1 rounded-full">
                                New
                              </span>
                            )}
                            <button
                              onClick={() => handleSaveMessage(message.id, message.is_saved || false)}
                              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                              title={message.is_saved ? 'Unsave message' : 'Save message'}
                            >
                              {message.is_saved ? (
                                <BookmarkCheck className="w-4 h-4 text-pink-500" />
                              ) : (
                                <Bookmark className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p
                          className="text-gray-800 mb-2"
                          onClick={() => {
                            if (!message.read) {
                              markAsReadMutation.mutate(message.id);
                            }
                          }}
                        >
                          {message.message_text}
                        </p>

                        {/* Reactions Display */}
                        {reactions.length > 0 && (
                          <div className="flex gap-1 mb-2">
                            {reactions.map((reaction) => (
                              <span key={reaction.id} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                {getReactionEmoji(reaction.reaction_type)}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReaction(message.id, 'love')}
                              className={`p-1 hover:bg-pink-100 rounded-full transition-colors ${
                                userLoved ? 'bg-pink-100' : ''
                              }`}
                              title="Love this message"
                            >
                              <Heart className={`w-4 h-4 ${userLoved ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                            </button>
                            <button
                              onClick={() => handleReaction(message.id, 'like')}
                              className={`p-1 hover:bg-blue-100 rounded-full transition-colors ${
                                userLiked ? 'bg-blue-100' : ''
                              }`}
                              title="Like this message"
                            >
                              <ThumbsUp className={`w-4 h-4 ${userLiked ? 'fill-blue-500 text-blue-500' : 'text-gray-400'}`} />
                            </button>
                            <button
                              onClick={() => handleReply(message)}
                              className="p-1 hover:bg-purple-100 rounded-full transition-colors"
                              title="Reply to this message"
                            >
                              <Reply className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Sent Tab */}
        {activeTab === 'sent' && (
          <div className="space-y-3">
            {loadingSent ? (
              <Card className="p-8 text-center border-0 shadow-lg">
                <p className="text-gray-500">Loading messages...</p>
              </Card>
            ) : sentMessages.length === 0 ? (
              <Card className="p-8 text-center border-0 shadow-lg">
                <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No messages sent yet</p>
                <p className="text-sm text-gray-400">
                  Send your first message to {partnerName || 'your partner'}!
                </p>
              </Card>
            ) : (
              sentMessages.map((message) => {
                const reactions = getMessageReactions(message.id);

                return (
                  <Card key={message.id} className="p-4 border-0 shadow-lg bg-white">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getMessageIcon(message.message_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-600">
                            To {partnerName || 'Your partner'}
                          </p>
                          {message.reply_to_id && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                              <Reply className="w-3 h-3" />
                              Reply
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 mb-2">{message.message_text}</p>

                        {/* Reactions Display */}
                        {reactions.length > 0 && (
                          <div className="flex gap-1 mb-2">
                            {reactions.map((reaction) => (
                              <span key={reaction.id} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                {getReactionEmoji(reaction.reaction_type)}
                                {reaction.user_id !== user?.id && ' from partner'}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
                          {message.read && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Read
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
