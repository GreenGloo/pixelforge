// ==========================================
// Item Presets - Common configurations
// ==========================================

import { ItemPromptOptions } from '../types';

export const ITEM_PRESETS: Record<string, Partial<ItemPromptOptions>> = {
  // Weapons - Medieval
  sword: { item: 'sword', category: 'weapon', theme: 'steel', size: 'medium' },
  dagger: { item: 'dagger', category: 'weapon', theme: 'steel', size: 'small' },
  axe: { item: 'battle axe', category: 'weapon', theme: 'iron', size: 'large' },
  bow: { item: 'bow', category: 'weapon', theme: 'wooden', size: 'medium' },
  staff: { item: 'magic staff', category: 'weapon', theme: 'enchanted', size: 'large', glow: 'purple' },
  hammer: { item: 'war hammer', category: 'weapon', theme: 'iron', size: 'large' },
  spear: { item: 'spear', category: 'weapon', theme: 'steel', size: 'large', orientation: 'vertical' },

  // Weapons - Sci-fi
  plasmaRifle: { item: 'plasma rifle', category: 'weapon', theme: 'plasma', size: 'medium', glow: 'cyan' },
  laserPistol: { item: 'laser pistol', category: 'weapon', theme: 'laser', size: 'small', glow: 'red' },
  energySword: { item: 'energy blade', category: 'weapon', theme: 'holographic', size: 'medium', glow: 'blue' },

  // Armor
  helmet: { item: 'helmet', category: 'armor', theme: 'steel', size: 'medium' },
  shield: { item: 'shield', category: 'armor', theme: 'iron', size: 'medium' },
  chestplate: { item: 'chestplate', category: 'armor', theme: 'steel', size: 'large' },
  boots: { item: 'boots', category: 'armor', theme: 'iron', size: 'small' },
  gauntlets: { item: 'gauntlets', category: 'armor', theme: 'steel', size: 'small' },

  // Consumables
  healthPotion: { item: 'health potion', category: 'consumable', theme: 'glass', size: 'small', glow: 'red' },
  manaPotion: { item: 'mana potion', category: 'consumable', theme: 'glass', size: 'small', glow: 'blue' },
  strengthPotion: { item: 'strength potion', category: 'consumable', theme: 'glass', size: 'small', glow: 'orange' },
  antidote: { item: 'antidote', category: 'consumable', theme: 'glass', size: 'small', glow: 'green' },

  // Food
  apple: { item: 'apple', category: 'food', size: 'tiny' },
  bread: { item: 'bread loaf', category: 'food', size: 'small' },
  meat: { item: 'cooked meat', category: 'food', size: 'small' },
  cheese: { item: 'cheese wheel', category: 'food', size: 'small' },

  // Currency
  goldCoin: { item: 'gold coin', category: 'currency', theme: 'golden', size: 'tiny' },
  silverCoin: { item: 'silver coin', category: 'currency', theme: 'silver', size: 'tiny' },
  gem: { item: 'gem', category: 'currency', theme: 'crystal', size: 'tiny', glow: 'purple' },

  // Materials
  wood: { item: 'wood planks', category: 'material', theme: 'wooden', size: 'small' },
  ore: { item: 'iron ore', category: 'material', theme: 'stone', size: 'small' },
  leather: { item: 'leather', category: 'material', size: 'small' },
  cloth: { item: 'cloth', category: 'material', size: 'small' },

  // Key Items
  key: { item: 'key', category: 'key_item', theme: 'golden', size: 'tiny' },
  scroll: { item: 'magic scroll', category: 'key_item', theme: 'ancient', size: 'small' },
  crystal: { item: 'crystal', category: 'key_item', theme: 'crystal', size: 'small', glow: 'white' },

  // Accessories
  ring: { item: 'ring', category: 'accessory', theme: 'golden', size: 'tiny' },
  amulet: { item: 'amulet', category: 'accessory', theme: 'enchanted', size: 'tiny', glow: 'gold' },
  bracelet: { item: 'bracelet', category: 'accessory', theme: 'silver', size: 'tiny' },

  // Tools
  pickaxe: { item: 'pickaxe', category: 'tool', theme: 'iron', size: 'medium' },
  torch: { item: 'torch', category: 'tool', size: 'small', glow: 'orange' },
  rope: { item: 'coiled rope', category: 'tool', size: 'small' },
  compass: { item: 'compass', category: 'tool', theme: 'golden', size: 'tiny' },
};

export default ITEM_PRESETS;
