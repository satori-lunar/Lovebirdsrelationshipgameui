/**
 * Gift History Component
 *
 * Displays sent and received widget gifts in a tabbed interface.
 * Shows gift status, timestamps, and allows viewing details.
 * Styled with rose/pink gradients matching the Lovebirds design system.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  ArrowLeft,
  Send,
  Inbox,
  Clock,
  CheckCircle2,
  Eye,
  XCircle,
  Gift,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { widgetGiftService } from '../services/widgetGiftService';
import { useAuth } from '../hooks/useAuth';
import type { WidgetGiftRow } from '../types/widget';

interface GiftHistoryProps {
  onBack: () => void;
}

type TabType = 'received' | 'sent';

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-700',
    icon: Clock
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-blue-100 text-blue-700',
    icon: CheckCircle2
  },
  seen: {
    label: 'Seen',
    color: 'bg-green-100 text-green-700',
    icon: Eye
  },
  dismissed: {
    label: 'Dismissed',
    color: 'bg-gray-100 text-gray-600',
    icon: XCircle
  },
  expired: {
    label: 'Expired',
    color: 'bg-red-100 text-red-600',
    icon: Clock
  },
};

export function GiftHistory({ onBack }: GiftHistoryProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [sentGifts, setSentGifts] = useState<WidgetGiftRow[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<WidgetGiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGift, setSelectedGift] = useState<WidgetGiftRow | null>(null);

  useEffect(() => {
    loadGifts();
  }, [user]);

  const loadGifts = async () => {
    if (!user) return;

    try {
      const [sent, received] = await Promise.all([
        widgetGiftService.getSentGifts(user.id),
        widgetGiftService.getReceivedGifts(user.id),
      ]);

      setSentGifts(sent);
      setReceivedGifts(received);
    } catch (error) {
      console.error('Failed to load gift history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const gifts = activeTab === 'sent' ? sentGifts : receivedGifts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-rose-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-rose-500" />
              Gift History
            </h1>
            <p className="text-sm text-gray-500">Your sent and received gifts</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'received'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Received
              {receivedGifts.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'received' ? 'bg-rose-100 text-rose-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {receivedGifts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'sent'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Send className="w-4 h-4" />
              Sent
              {sentGifts.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'sent' ? 'bg-rose-100 text-rose-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {sentGifts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Heart className="w-10 h-10 text-rose-400" />
            </motion.div>
            <p className="text-gray-500 mt-4">Loading gifts...</p>
          </div>
        ) : gifts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
              {activeTab === 'received' ? (
                <Inbox className="w-10 h-10 text-rose-400" />
              ) : (
                <Send className="w-10 h-10 text-rose-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-700">
              No {activeTab} gifts yet
            </h3>
            <p className="text-gray-500 text-center mt-2 max-w-xs">
              {activeTab === 'received'
                ? "When your partner sends you a widget gift, it will appear here"
                : "Send a gift to your partner's widget and it will appear here"}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'sent' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'sent' ? -20 : 20 }}
              className="space-y-3"
            >
              {gifts.map((gift, index) => {
                const status = statusConfig[gift.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={gift.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedGift(gift)}
                    className="bg-white rounded-2xl border border-rose-100 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Photo thumbnail or icon */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-rose-100 to-pink-100">
                        {gift.photo_url ? (
                          <img
                            src={gift.photo_url}
                            alt="Gift"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Heart className="w-6 h-6 text-rose-400" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(gift.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-800 font-medium truncate">
                          {gift.message || (gift.gift_type === 'memory' ? 'Shared Memory' : 'Photo Gift')}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">
                          {gift.gift_type.replace('_', ' ')}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-rose-400 transition-colors flex-shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Gift Detail Modal */}
      <AnimatePresence>
        {selectedGift && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedGift(null)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl"
            >
              {/* Photo */}
              {selectedGift.photo_url && (
                <div className="relative h-56">
                  <img
                    src={selectedGift.photo_url}
                    alt="Gift"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  {(() => {
                    const status = statusConfig[selectedGift.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <span className={`text-sm px-3 py-1 rounded-full flex items-center gap-1.5 ${status.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {status.label}
                      </span>
                    );
                  })()}
                </div>

                {selectedGift.message && (
                  <p className="text-gray-800 text-lg italic mb-3">
                    "{selectedGift.message}"
                  </p>
                )}

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    <span>Type: {selectedGift.gift_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>Sent: {new Date(selectedGift.created_at).toLocaleString()}</span>
                  </div>
                  {selectedGift.expires_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-400" />
                      <span>Expires: {new Date(selectedGift.expires_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedGift(null)}
                  className="w-full mt-5 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg shadow-rose-200 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
