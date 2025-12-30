import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function useUnreadRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch pending request count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await api.supabase
        .from('partner_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error counting pending requests:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to real-time request updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = api.supabase
      .channel('partner_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // Show toast notification
          const request = payload.new as any;
          const requestType = request.request_type || 'request';
          const emoji = getRequestEmoji(requestType);
          const label = getRequestLabel(requestType);

          toast(`${emoji} New request from your partner!`, {
            description: `They're asking for: ${label}`,
            duration: 5000,
          });

          // Invalidate queries to refresh counts
          queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
          queryClient.invalidateQueries({ queryKey: ['requests', 'received'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, queryClient]);

  return {
    pendingCount,
    hasPending: pendingCount > 0,
  };
}

function getRequestEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    hug: '🤗',
    quality_time: '⏰',
    cuddle: '🌙',
    back_rub: '💆',
    talk: '☕',
    date_night: '🌟',
    help: '🙏',
    surprise: '🎁',
  };
  return emojiMap[type] || '💝';
}

function getRequestLabel(type: string): string {
  const labelMap: Record<string, string> = {
    hug: 'Hug',
    quality_time: 'Quality Time',
    cuddle: 'Cuddle',
    back_rub: 'Back Rub',
    talk: 'Talk',
    date_night: 'Date Night',
    help: 'Help',
    surprise: 'Surprise',
  };
  return labelMap[type] || 'Something special';
}
