import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { dragonService, DragonItem } from '../services/dragonService';
import { dragonGameLogic } from '../services/dragonGameLogic';

export function useDragonInventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch inventory
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['dragon-inventory', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return dragonService.getInventory(user.id);
    },
    enabled: !!user?.id,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (!user?.id) throw new Error('Not authenticated');
      return dragonService.addItem(user.id, itemId, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon-inventory'] });
    },
  });

  // Use item mutation (handled by feedDragon and playWithDragon in useDragon hook)
  // But we provide a general useItem for accessories or other items
  const useItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return dragonService.useItem(user.id, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon-inventory'] });
    },
  });

  // Get items by type
  const getItemsByType = (type: 'food' | 'treat' | 'toy' | 'accessory'): DragonItem[] => {
    return inventory.filter(item => item.item_type === type);
  };

  // Get item quantity
  const getItemQuantity = (itemId: string): number => {
    const item = inventory.find(i => i.item_id === itemId);
    return item ? item.quantity : 0;
  };

  // Check if has item
  const hasItem = (itemId: string): boolean => {
    return getItemQuantity(itemId) > 0;
  };

  return {
    inventory,
    isLoading,
    getItemsByType,
    getItemQuantity,
    hasItem,
    addItem: addItemMutation.mutate,
    useItem: useItemMutation.mutate,
    isAdding: addItemMutation.isPending,
    isUsing: useItemMutation.isPending,
  };
}

export function useDragonActivities() {
  const { user } = useAuth();

  // Fetch recent activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['dragon-activities', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return dragonService.getRecentActivities(user.id, 20);
    },
    enabled: !!user?.id,
  });

  return {
    activities,
    isLoading,
  };
}

export function useDragonInteractions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch received interactions
  const { data: receivedInteractions = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['dragon-interactions', 'received', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return dragonService.getReceivedInteractions(user.id);
    },
    enabled: !!user?.id,
  });

  // Fetch sent interactions
  const { data: sentInteractions = [], isLoading: loadingSent } = useQuery({
    queryKey: ['dragon-interactions', 'sent', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return dragonService.getSentInteractions(user.id);
    },
    enabled: !!user?.id,
  });

  // Send gift mutation
  const sendGiftMutation = useMutation({
    mutationFn: async ({
      toUserId,
      itemId,
      message,
    }: {
      toUserId: string;
      itemId: string;
      message?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if user has the item
      const hasItem = await dragonService.hasItem(user.id, itemId);
      if (!hasItem) {
        throw new Error('Item not found in inventory');
      }

      // Use the item from sender's inventory
      await dragonService.useItem(user.id, itemId);

      // Add item to receiver's inventory
      await dragonService.addItem(toUserId, itemId, 1);

      // Record interaction
      await dragonService.sendGiftToDragon(user.id, toUserId, itemId, message);

      // Award XP for sending gift
      await dragonGameLogic.awardActivityCompletion(user.id, 'dragon_gift_sent', Date.now().toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dragon-interactions'] });
    },
  });

  return {
    receivedInteractions,
    sentInteractions,
    isLoading: loadingReceived || loadingSent,
    sendGift: sendGiftMutation.mutate,
    isSending: sendGiftMutation.isPending,
  };
}
