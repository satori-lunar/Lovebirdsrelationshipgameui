import { dragonService, Dragon, ItemReward } from './dragonService';

export interface ActivityReward {
  xp: number;
  items: ItemReward[];
  leveledUp: boolean;
  evolved: boolean;
  newStage?: string;
}

export interface ItemDefinition {
  id: string;
  name: string;
  type: 'food' | 'treat' | 'toy' | 'accessory';
  effects: {
    hunger?: number;
    happiness?: number;
    bond?: number;
    health?: number;
  };
  rarity: 'common' | 'uncommon' | 'rare';
}

// XP thresholds for evolution
const XP_THRESHOLDS = {
  egg: 0,
  hatchling: 100,
  young: 400,
  teen: 1000,
  adult: 2000,
};

// Activity XP rewards
const ACTIVITY_XP = {
  daily_question_answer: 10,
  daily_question_guess: 15,
  message_sent: 5,
  request_sent: 5,
  request_completed: 20,
  date_saved: 5,
  date_completed: 30,
  gift_saved: 5,
  gift_completed: 25,
  memory_saved: 15,
  insight_saved: 10,
  surprise_planned: 15,
  surprise_completed: 35,
  dragon_gift_sent: 5,
  dragon_played: 3,
  dragon_fed: 2,
};

// Item definitions
const ITEM_DEFINITIONS: { [key: string]: ItemDefinition } = {
  // Food items
  apple: {
    id: 'apple',
    name: 'Apple',
    type: 'food',
    effects: { hunger: 10 },
    rarity: 'common',
  },
  cake: {
    id: 'cake',
    name: 'Cake',
    type: 'food',
    effects: { hunger: 20 },
    rarity: 'uncommon',
  },
  feast: {
    id: 'feast',
    name: 'Feast',
    type: 'food',
    effects: { hunger: 40 },
    rarity: 'rare',
  },
  // Treat items
  cookie: {
    id: 'cookie',
    name: 'Cookie',
    type: 'treat',
    effects: { happiness: 10 },
    rarity: 'common',
  },
  ice_cream: {
    id: 'ice_cream',
    name: 'Ice Cream',
    type: 'treat',
    effects: { happiness: 15 },
    rarity: 'uncommon',
  },
  party_cake: {
    id: 'party_cake',
    name: 'Party Cake',
    type: 'treat',
    effects: { happiness: 30 },
    rarity: 'rare',
  },
  // Toy items
  ball: {
    id: 'ball',
    name: 'Ball',
    type: 'toy',
    effects: { bond: 5, happiness: 10 },
    rarity: 'common',
  },
  puzzle: {
    id: 'puzzle',
    name: 'Puzzle',
    type: 'toy',
    effects: { bond: 10, happiness: 15 },
    rarity: 'uncommon',
  },
  dragon_toy: {
    id: 'dragon_toy',
    name: 'Dragon Toy',
    type: 'toy',
    effects: { bond: 15, happiness: 20 },
    rarity: 'rare',
  },
};

export const dragonGameLogic = {
  // XP and leveling
  async awardXP(
    userId: string,
    xp: number,
    source: string
  ): Promise<{ dragon: Dragon; leveledUp: boolean; evolved: boolean; newStage?: string }> {
    const dragon = await dragonService.getDragon(userId);
    if (!dragon) {
      throw new Error('Dragon not found');
    }

    const newExperience = dragon.experience + xp;
    const oldStage = dragon.stage;

    // Update dragon with new XP
    let updates: any = {
      experience: newExperience,
    };

    // Check for evolution
    const evolutionResult = this.checkEvolution(dragon.stage, newExperience);
    if (evolutionResult.evolved && evolutionResult.newStage) {
      updates.stage = evolutionResult.newStage;

      // Update evolution timestamps
      if (evolutionResult.newStage === 'hatchling') {
        updates.evolved_to_hatchling_at = new Date().toISOString();
      } else if (evolutionResult.newStage === 'young') {
        updates.evolved_to_young_at = new Date().toISOString();
      } else if (evolutionResult.newStage === 'teen') {
        updates.evolved_to_teen_at = new Date().toISOString();
      } else if (evolutionResult.newStage === 'adult') {
        updates.evolved_to_adult_at = new Date().toISOString();
      }
    }

    const updatedDragon = await dragonService.updateDragon(userId, updates);

    return {
      dragon: updatedDragon,
      leveledUp: false, // TODO: Implement leveling if needed
      evolved: evolutionResult.evolved,
      newStage: evolutionResult.newStage,
    };
  },

  checkEvolution(
    currentStage: string,
    currentXP: number
  ): { evolved: boolean; newStage?: string } {
    const stages: Array<keyof typeof XP_THRESHOLDS> = ['egg', 'hatchling', 'young', 'teen', 'adult'];
    const currentIndex = stages.indexOf(currentStage as any);

    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      return { evolved: false };
    }

    // Check if we've reached the next stage threshold
    const nextStage = stages[currentIndex + 1];
    const nextThreshold = XP_THRESHOLDS[nextStage];

    if (currentXP >= nextThreshold) {
      return { evolved: true, newStage: nextStage };
    }

    return { evolved: false };
  },

  calculateXPForNextStage(currentStage: string, currentXP: number): { required: number; progress: number } {
    const stages: Array<keyof typeof XP_THRESHOLDS> = ['egg', 'hatchling', 'young', 'teen', 'adult'];
    const currentIndex = stages.indexOf(currentStage as any);

    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      return { required: 0, progress: 100 };
    }

    const nextStage = stages[currentIndex + 1];
    const currentThreshold = XP_THRESHOLDS[currentStage as keyof typeof XP_THRESHOLDS];
    const nextThreshold = XP_THRESHOLDS[nextStage];

    const required = nextThreshold - currentThreshold;
    const earned = currentXP - currentThreshold;
    const progress = Math.min(100, Math.floor((earned / required) * 100));

    return { required, progress };
  },

  // Stat management
  async updateStats(userId: string): Promise<Dragon> {
    const dragon = await dragonService.getDragon(userId);
    if (!dragon) {
      throw new Error('Dragon not found');
    }

    const now = new Date();
    const lastUpdated = new Date(dragon.updated_at);

    // Calculate stat decay
    const decay = this.calculateStatDecay(lastUpdated);

    // Apply decay
    const newHunger = Math.max(0, dragon.hunger - decay.hungerLoss);
    const newHappiness = Math.max(0, dragon.happiness - decay.happinessLoss);

    // Health decreases if hunger or happiness is low
    let newHealth = dragon.health;
    if (newHunger < 20 || newHappiness < 20) {
      newHealth = Math.max(0, dragon.health - decay.healthLoss);
    }

    // Update dragon stats
    const updatedDragon = await dragonService.updateDragon(userId, {
      hunger: newHunger,
      happiness: newHappiness,
      health: newHealth,
    });

    return updatedDragon;
  },

  calculateStatDecay(lastUpdated: Date): { hungerLoss: number; happinessLoss: number; healthLoss: number } {
    const now = new Date();
    const hoursPassed = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

    // Hunger: decreases by 1 every 2 hours
    const hungerLoss = Math.floor(hoursPassed / 2);

    // Happiness: decreases by 1 every 3 hours
    const happinessLoss = Math.floor(hoursPassed / 3);

    // Health: decreases by 1 every hour (only if hunger/happiness low)
    const healthLoss = Math.floor(hoursPassed);

    return { hungerLoss, happinessLoss, healthLoss };
  },

  async feedDragon(userId: string, foodItemId: string): Promise<Dragon> {
    // Check if user has the item
    const hasItem = await dragonService.hasItem(userId, foodItemId);
    if (!hasItem) {
      throw new Error('Item not found in inventory');
    }

    // Use the item
    const used = await dragonService.useItem(userId, foodItemId);
    if (!used) {
      throw new Error('Failed to use item');
    }

    // Get dragon and apply food effect
    const dragon = await dragonService.getDragon(userId);
    if (!dragon) {
      throw new Error('Dragon not found');
    }

    const itemDef = this.getItemDefinition(foodItemId);
    const newHunger = Math.min(100, dragon.hunger + (itemDef.effects.hunger || 0));

    // Update dragon
    const updatedDragon = await dragonService.updateDragon(userId, {
      hunger: newHunger,
      last_fed_at: new Date().toISOString(),
    });

    // Award small XP for feeding
    await this.awardActivityCompletion(userId, 'dragon_fed', Date.now().toString());

    return updatedDragon;
  },

  async playWithDragon(userId: string, toyItemId?: string): Promise<Dragon> {
    const dragon = await dragonService.getDragon(userId);
    if (!dragon) {
      throw new Error('Dragon not found');
    }

    let happinessBoost = 5; // Base happiness from playing
    let bondBoost = 2; // Base bond from playing

    if (toyItemId) {
      // Check if user has the toy
      const hasItem = await dragonService.hasItem(userId, toyItemId);
      if (!hasItem) {
        throw new Error('Toy not found in inventory');
      }

      // Use the toy
      await dragonService.useItem(userId, toyItemId);

      // Apply toy effects
      const itemDef = this.getItemDefinition(toyItemId);
      happinessBoost += itemDef.effects.happiness || 0;
      bondBoost += itemDef.effects.bond || 0;
    }

    // Update dragon
    const newHappiness = Math.min(100, dragon.happiness + happinessBoost);
    const newBondLevel = Math.min(100, dragon.bond_level + bondBoost);

    const updatedDragon = await dragonService.updateDragon(userId, {
      happiness: newHappiness,
      bond_level: newBondLevel,
      last_played_at: new Date().toISOString(),
    });

    // Award small XP for playing
    await this.awardActivityCompletion(userId, 'dragon_played', Date.now().toString());

    return updatedDragon;
  },

  // Item effects
  applyItemEffect(dragon: Dragon, itemId: string): Partial<Dragon> {
    const itemDef = this.getItemDefinition(itemId);
    const updates: Partial<Dragon> = {};

    if (itemDef.effects.hunger) {
      updates.hunger = Math.min(100, dragon.hunger + itemDef.effects.hunger);
    }
    if (itemDef.effects.happiness) {
      updates.happiness = Math.min(100, dragon.happiness + itemDef.effects.happiness);
    }
    if (itemDef.effects.bond) {
      updates.bond_level = Math.min(100, dragon.bond_level + itemDef.effects.bond);
    }
    if (itemDef.effects.health) {
      updates.health = Math.min(100, dragon.health + itemDef.effects.health);
    }

    return updates;
  },

  getItemDefinition(itemId: string): ItemDefinition {
    return ITEM_DEFINITIONS[itemId] || {
      id: itemId,
      name: itemId,
      type: 'accessory',
      effects: {},
      rarity: 'common',
    };
  },

  getRandomItemReward(activityType: string): ItemReward | null {
    // Define probabilities and items for different activities
    const rewards: { [key: string]: { chance: number; items: string[] } } = {
      request_completed: { chance: 0.2, items: ['cookie', 'apple'] },
      date_completed: { chance: 1.0, items: ['party_cake'] },
      gift_completed: { chance: 0.3, items: ['ball', 'puzzle'] },
      surprise_completed: { chance: 1.0, items: ['feast'] },
    };

    const reward = rewards[activityType];
    if (!reward) return null;

    // Roll for chance
    if (Math.random() > reward.chance) return null;

    // Pick random item from the list
    const itemId = reward.items[Math.floor(Math.random() * reward.items.length)];

    return { itemId, quantity: 1 };
  },

  // Integration helper - main entry point for awarding activity completion
  async awardActivityCompletion(
    userId: string,
    activityType: string,
    activityId: string
  ): Promise<ActivityReward> {
    // 🔒 DRAGON GAMIFICATION FROZEN - No XP or rewards awarded
    // Return empty reward for all activities
    return {
      xp: 0,
      items: [],
      leveledUp: false,
      evolved: false,
    };

    /* ORIGINAL CODE COMMENTED OUT FOR FREEZING
    // Check if already logged
    const alreadyLogged = await dragonService.hasLoggedActivity(userId, activityType, activityId);
    if (alreadyLogged) {
      // Already awarded, return empty reward
      return {
        xp: 0,
        items: [],
        leveledUp: false,
        evolved: false,
      };
    }

    // Get XP for this activity
    const xp = ACTIVITY_XP[activityType as keyof typeof ACTIVITY_XP] || 0;

    // Get random item reward (if any)
    const itemReward = this.getRandomItemReward(activityType);
    const items: ItemReward[] = itemReward ? [itemReward] : [];

    // Award XP
    const xpResult = await this.awardXP(userId, xp, activityType);

    // Add items to inventory
    for (const item of items) {
      await dragonService.addItem(userId, item.itemId, item.quantity);
    }

    // Log activity
    await dragonService.logActivity(userId, activityType, activityId, xp, items);

    return {
      xp,
      items,
      leveledUp: xpResult.leveledUp,
      evolved: xpResult.evolved,
      newStage: xpResult.newStage,
    };
    */
  },

  // Get all item definitions for UI display
  getAllItemDefinitions(): ItemDefinition[] {
    return Object.values(ITEM_DEFINITIONS);
  },

  // Get items by type
  getItemsByType(type: 'food' | 'treat' | 'toy' | 'accessory'): ItemDefinition[] {
    return Object.values(ITEM_DEFINITIONS).filter(item => item.type === type);
  },
};
