const mainStatsBySlot: Record<string, string[]> = {
  'Planar Sphere': [
    'HP',
    'ATK',
    'DEF',
    'Physical DMG Boost',
    'Fire DMG Boost',
    'Ice DMG Boost',
    'Wind DMG Boost',
    'Lightning DMG Boost',
    'Quantum DMG Boost',
    'Imaginary DMG Boost',
  ],
  'Link Rope': ['HP', 'ATK', 'DEF', 'Break Effect', 'Energy Regeneration Rate'],
  Head: ['HP'],
  Body: ['HP', 'ATK', 'DEF', 'CRIT Rate', 'CRIT DMG', 'Effect Hit Rate', 'Outgoing Healing Boost'],
  Hand: ['ATK'],
  Feet: ['HP', 'SPD', 'DEF', 'ATK'],
};

export default mainStatsBySlot;