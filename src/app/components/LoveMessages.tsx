import { useState } from 'react';
import { ChevronLeft, Heart, Send, MessageCircle, Sparkles, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { useAuth } from '../hooks/useAuth';
import { usePartner } from '../hooks/usePartner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

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
  const { partner, relationship } = usePartner();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [selectedType, setSelectedType] = useState<'custom' | keyof typeof MESSAGE_TEMPLATES>('custom');
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'received' | 'sent'>('send');

  const partnerId = relationship?.user1_id === user?.id
    ? relationship?.user2_id
    : relationship?.user1_id;

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

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, type }: { text: string; type: string }) => {
      if (!user?.id || !partnerId) throw new Error('Not authenticated');

      const { data, error } = await api.supabase
        .from('partner_messages')
        .insert({
          sender_id: user.id,
          receiver_id: partnerId,
          message_text: text,
          message_type: type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageText('');
      setSelectedType('custom');
      setShowTemplates(false);
      toast.success('Message sent! 💌');
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

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      toast.error('Please write a message');
      return;
    }

    sendMessageMutation.mutate({
      text: messageText,
      type: selectedType === 'custom' ? 'message' : selectedType,
    });
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
                  Send sweet notes to {partner?.name || 'your partner'}
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
                  {partner?.name || 'Your partner'} hasn't sent you any messages yet
                </p>
              </Card>
            ) : (
              receivedMessages.map((message) => (
                <Card
                  key={message.id}
                  className={`p-4 border-0 shadow-lg transition-all ${
                    !message.read ? 'bg-pink-50 border-l-4 border-pink-500' : 'bg-white'
                  }`}
                  onClick={() => {
                    if (!message.read) {
                      markAsReadMutation.mutate(message.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getMessageIcon(message.message_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600">
                          From {partner?.name || 'Your partner'}
                        </p>
                        {!message.read && (
                          <span className="text-xs bg-pink-500 text-white px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 mb-2">{message.message_text}</p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
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
                  Send your first message to {partner?.name || 'your partner'}!
                </p>
              </Card>
            ) : (
              sentMessages.map((message) => (
                <Card key={message.id} className="p-4 border-0 shadow-lg bg-white">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getMessageIcon(message.message_type)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        To {partner?.name || 'Your partner'}
                      </p>
                      <p className="text-gray-800 mb-2">{message.message_text}</p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
