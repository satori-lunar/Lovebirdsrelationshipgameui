import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function useUnreadMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch unread message count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await api.supabase
        .from('partner_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error counting unread messages:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = api.supabase
      .channel('partner_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // Show toast notification
          const message = payload.new as any;
          const messageType = message.message_type || 'message';
          const emoji = getMessageEmoji(messageType);

          toast(`${emoji} New message!`, {
            description: message.message_text.substring(0, 50) + (message.message_text.length > 50 ? '...' : ''),
            duration: 5000,
          });

          // Invalidate queries to refresh counts
          queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
          queryClient.invalidateQueries({ queryKey: ['messages', 'received'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, queryClient]);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
  };
}

function getMessageEmoji(type: string): string {
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
}
