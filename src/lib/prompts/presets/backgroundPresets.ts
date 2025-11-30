// ==========================================
// Background Presets - Common configurations
// ==========================================

import { BackgroundPromptOptions } from '../types';

export const BACKGROUND_PRESETS: Record<string, BackgroundPromptOptions> = {
  // Forest scenes
  forestDay: {
    environment: 'forest',
    view: 'side-scroll',
    timeOfDay: 'day',
    mood: 'peaceful',
  },
  forestNight: {
    environment: 'forest',
    view: 'side-scroll',
    timeOfDay: 'night',
    mood: 'mysterious',
  },
  forestSunset: {
    environment: 'forest',
    view: 'side-scroll',
    timeOfDay: 'sunset',
    mood: 'peaceful',
  },

  // Dungeon scenes
  dungeonCorridor: {
    environment: 'dungeon',
    view: 'side-scroll',
    timeOfDay: 'night',
    mood: 'ominous',
  },
  dungeonTopDown: {
    environment: 'dungeon',
    view: 'top-down',
    timeOfDay: 'night',
    mood: 'dangerous',
  },

  // City scenes
  cityDay: {
    environment: 'city',
    view: 'side-scroll',
    timeOfDay: 'day',
    mood: 'lively',
  },
  cityNight: {
    environment: 'city',
    view: 'side-scroll',
    timeOfDay: 'night',
    mood: 'mysterious',
  },
  cyberpunkCity: {
    environment: 'cyberpunk',
    view: 'side-scroll',
    timeOfDay: 'night',
    colors: 'neon pink, cyan, purple',
  },

  // Castle scenes
  castleInterior: {
    environment: 'castle',
    view: 'side-scroll',
    mood: 'ancient',
  },
  castleExterior: {
    environment: 'castle',
    view: 'side-scroll',
    timeOfDay: 'day',
  },

  // Nature scenes
  desert: {
    environment: 'desert',
    view: 'side-scroll',
    timeOfDay: 'day',
  },
  snowLandscape: {
    environment: 'snow',
    view: 'side-scroll',
    timeOfDay: 'day',
    mood: 'peaceful',
  },
  swamp: {
    environment: 'swamp',
    view: 'side-scroll',
    timeOfDay: 'night',
    mood: 'ominous',
  },
  volcano: {
    environment: 'volcano',
    view: 'side-scroll',
    mood: 'dangerous',
  },

  // Cave scenes
  cave: {
    environment: 'cave',
    view: 'side-scroll',
    timeOfDay: 'night',
    mood: 'mysterious',
  },

  // Sci-fi scenes
  spaceshipCorridor: {
    environment: 'spaceship',
    view: 'side-scroll',
    mood: 'futuristic',
  },
  spaceBackground: {
    environment: 'space',
    view: 'parallax-sky',
    timeOfDay: 'night',
  },

  // Water scenes
  underwater: {
    environment: 'underwater',
    view: 'side-scroll',
    colors: 'deep blue, turquoise',
  },
  ocean: {
    environment: 'ocean',
    view: 'side-scroll',
    timeOfDay: 'day',
  },

  // Parallax layers
  skyDay: {
    environment: 'sky',
    view: 'parallax-sky',
    timeOfDay: 'day',
    seamless: true,
  },
  skyNight: {
    environment: 'sky',
    view: 'parallax-sky',
    timeOfDay: 'night',
    seamless: true,
  },
  skySunset: {
    environment: 'sky',
    view: 'parallax-sky',
    timeOfDay: 'sunset',
    seamless: true,
  },

  // Special locations
  temple: {
    environment: 'temple',
    view: 'side-scroll',
    mood: 'magical',
  },
  library: {
    environment: 'library',
    view: 'side-scroll',
    mood: 'ancient',
  },
  arena: {
    environment: 'arena',
    view: 'side-scroll',
    mood: 'dangerous',
  },
  graveyard: {
    environment: 'graveyard',
    view: 'side-scroll',
    timeOfDay: 'night',
    mood: 'haunted',
  },
  ruins: {
    environment: 'ruins',
    view: 'side-scroll',
    mood: 'ancient',
  },
};

export default BACKGROUND_PRESETS;
