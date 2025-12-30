import { useState } from 'react';
import { ChevronLeft, Heart, HandHeart, Clock, Moon, Zap, Coffee, HelpCircle, Gift, Check, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface PartnerRequestsProps {
  onBack: () => void;
}

interface PartnerRequest {
  id: string;
  requester_id: string;
  receiver_id: string;
  request_type: 'hug' | 'quality_time' | 'date_night' | 'back_rub' | 'cuddle' | 'talk' | 'help' | 'surprise';
  message: string;
  status: 'pending' | 'acknowledged' | 'completed' | 'declined';
  created_at: string;
  responded_at?: string;
}

const REQUEST_TYPES = [
  { type: 'hug', label: 'Hug', icon: Heart, color: 'from-pink-400 to-rose-400', emoji: '🤗' },
  { type: 'quality_time', label: 'Quality Time', icon: Clock, color: 'from-purple-400 to-indigo-400', emoji: '⏰' },
  { type: 'cuddle', label: 'Cuddle', icon: Moon, color: 'from-blue-400 to-cyan-400', emoji: '🌙' },
  { type: 'back_rub', label: 'Back Rub', icon: HandHeart, color: 'from-green-400 to-emerald-400', emoji: '💆' },
  { type: 'talk', label: 'Talk', icon: Coffee, color: 'from-amber-400 to-orange-400', emoji: '☕' },
  { type: 'date_night', label: 'Date Night', icon: Zap, color: 'from-red-400 to-pink-400', emoji: '🌟' },
  { type: 'help', label: 'Help', icon: HelpCircle, color: 'from-gray-400 to-slate-400', emoji: '🙏' },
  { type: 'surprise', label: 'Surprise Me', icon: Gift, color: 'from-violet-400 to-purple-400', emoji: '🎁' },
] as const;

export function PartnerRequests({ onBack }: PartnerRequestsProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const { partnerName } = usePartnerOnboarding();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'send' | 'received' | 'sent'>('send');

  // Fetch received requests
  const { data: receivedRequests = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['requests', 'received', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await api.supabase
        .from('partner_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch sent requests
  const { data: sentRequests = [], isLoading: loadingSent } = useQuery({
    queryKey: ['requests', 'sent', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await api.supabase
        .from('partner_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Send request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async ({ type, message }: { type: string; message: string }) => {
      if (!user?.id || !partnerId) throw new Error('Not authenticated');

      const { data, error } = await api.supabase
        .from('partner_requests')
        .insert({
          requester_id: user.id,
          receiver_id: partnerId,
          request_type: type,
          message: message || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setSelectedType(null);
      setRequestMessage('');
      toast.success('Request sent! 💝');
    },
    onError: (error) => {
      toast.error('Failed to send request');
      console.error('Error sending request:', error);
    },
  });

  // Update request status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { error } = await api.supabase
        .from('partner_requests')
        .update({
          status,
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', 'received'] });
    },
  });

  const handleSendRequest = () => {
    if (!selectedType) {
      toast.error('Please select a request type');
      return;
    }

    sendRequestMutation.mutate({
      type: selectedType,
      message: requestMessage,
    });
  };

  const getRequestConfig = (type: string) => {
    return REQUEST_TYPES.find(r => r.type === type) || REQUEST_TYPES[0];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Pending</span>;
      case 'acknowledged':
        return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Acknowledged</span>;
      case 'completed':
        return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1"><Check className="w-3 h-3" />Done!</span>;
      case 'declined':
        return <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Declined</span>;
      default:
        return null;
    }
  };

  const pendingCount = receivedRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 pb-12">
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
                <HandHeart className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">Partner Requests</h1>
                <p className="text-white/90 text-sm">
                  Ask for what you need
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
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <HandHeart className="w-4 h-4 inline mr-2" />
            Request
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all relative ${
              activeTab === 'received'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/50 text-gray-600'
            }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Received
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'sent'
                ? 'bg-white text-purple-600 shadow-lg'
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
                <Heart className="w-5 h-5 text-purple-500" />
                What do you need?
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {REQUEST_TYPES.map(({ type, label, icon: Icon, color, emoji }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedType === type
                        ? `bg-gradient-to-br ${color} border-transparent text-white shadow-lg`
                        : 'border-gray-200 hover:border-purple-300 bg-white'
                    }`}
                  >
                    <div className="text-2xl mb-2">{emoji}</div>
                    <p className="font-medium text-sm">{label}</p>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {selectedType && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">
                        Add a message (optional)
                      </label>
                      <Textarea
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        placeholder="e.g., 'I've had a long day and could really use this'"
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    <Button
                      onClick={handleSendRequest}
                      disabled={sendRequestMutation.isPending}
                      className={`w-full bg-gradient-to-r ${getRequestConfig(selectedType).color} hover:opacity-90 text-white`}
                    >
                      <HandHeart className="w-4 h-4 mr-2" />
                      Send Request
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            <Card className="p-4 border-0 shadow-lg bg-purple-50">
              <p className="text-sm text-gray-700">
                <strong>💡 Why this helps:</strong> Asking for what you need builds intimacy and helps your partner understand you better!
              </p>
            </Card>
          </div>
        )}

        {/* Received Tab */}
        {activeTab === 'received' && (
          <div className="space-y-3">
            {loadingReceived ? (
              <Card className="p-8 text-center border-0 shadow-lg">
                <p className="text-gray-500">Loading requests...</p>
              </Card>
            ) : receivedRequests.length === 0 ? (
              <Card className="p-8 text-center border-0 shadow-lg">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No requests yet</p>
                <p className="text-sm text-gray-400">
                  {partnerName || 'Your partner'} hasn't sent any requests yet
                </p>
              </Card>
            ) : (
              receivedRequests.map((request) => {
                const config = getRequestConfig(request.request_type);
                const Icon = config.icon;

                return (
                  <Card
                    key={request.id}
                    className={`p-5 border-0 shadow-lg transition-all ${
                      request.status === 'pending' ? 'bg-purple-50 border-l-4 border-purple-500' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">{config.label}</p>
                            <p className="text-sm text-gray-600">
                              From {partnerName || 'Your partner'}
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>

                        {request.message && (
                          <p className="text-gray-700 mb-3 text-sm bg-white p-3 rounded-lg">
                            "{request.message}"
                          </p>
                        )}

                        <p className="text-xs text-gray-400 mb-3">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>

                        {request.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => updateStatusMutation.mutate({ requestId: request.id, status: 'acknowledged' })}
                              size="sm"
                              className="flex-1 bg-blue-500 hover:bg-blue-600"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Acknowledge
                            </Button>
                            <Button
                              onClick={() => updateStatusMutation.mutate({ requestId: request.id, status: 'completed' })}
                              size="sm"
                              className="flex-1 bg-green-500 hover:bg-green-600"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Done!
                            </Button>
                          </div>
                        )}

                        {request.status === 'acknowledged' && (
                          <Button
                            onClick={() => updateStatusMutation.mutate({ requestId: request.id, status: 'completed' })}
                            size="sm"
                            className="w-full bg-green-500 hover:bg-green-600"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Mark as Done
                          </Button>
                        )}
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
                <p className="text-gray-500">Loading requests...</p>
              </Card>
            ) : sentRequests.length === 0 ? (
              <Card className="p-8 text-center border-0 shadow-lg">
                <HandHeart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No requests sent yet</p>
                <p className="text-sm text-gray-400">
                  Send your first request to {partnerName || 'your partner'}!
                </p>
              </Card>
            ) : (
              sentRequests.map((request) => {
                const config = getRequestConfig(request.request_type);
                const Icon = config.icon;

                return (
                  <Card key={request.id} className="p-5 border-0 shadow-lg bg-white">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">{config.label}</p>
                            <p className="text-sm text-gray-600">
                              To {partnerName || 'Your partner'}
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>

                        {request.message && (
                          <p className="text-gray-700 mb-3 text-sm bg-gray-50 p-3 rounded-lg">
                            "{request.message}"
                          </p>
                        )}

                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
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
