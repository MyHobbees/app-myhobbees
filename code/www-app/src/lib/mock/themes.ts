export type BoxTheme = {
  id: string;
  name: string;
  emoji: string;
  gradient: readonly [string, string];
};

export const boxThemes: BoxTheme[] = [
  { id: 'crochet', name: 'Crochet', emoji: '🧶', gradient: ['#F2994A', '#EB5757'] },
  { id: 'tricot', name: 'Tricot', emoji: '🧣', gradient: ['#56CCF2', '#2F80ED'] },
  { id: 'broderie', name: 'Broderie', emoji: '🪡', gradient: ['#CD6581', '#8E5AA8'] },
  { id: 'macrame', name: 'Macramé', emoji: '🪢', gradient: ['#A9836B', '#6E4B36'] },
  { id: 'peinture', name: 'Peinture par numéros', emoji: '🎨', gradient: ['#F2C94C', '#F2994A'] },
  { id: 'bijoux', name: 'Bijoux en perles', emoji: '📿', gradient: ['#6FCF97', '#219653'] },
  { id: 'origami', name: 'Origami', emoji: '🦢', gradient: ['#F299C2', '#CD6581'] },
  { id: 'scrapbooking', name: 'Scrapbooking', emoji: '📔', gradient: ['#F2994A', '#CD6581'] },
  { id: 'argile', name: 'Modelage argile', emoji: '🏺', gradient: ['#A67C52', '#7A5230'] },
  { id: 'bougies', name: 'Bougies', emoji: '🕯️', gradient: ['#F5B759', '#E5883C'] },
  { id: 'savonnerie', name: 'Savonnerie', emoji: '🧼', gradient: ['#7FD1C0', '#2D9CDB'] },
  { id: 'aquarelle', name: 'Aquarelle', emoji: '🖌️', gradient: ['#56CCF2', '#9B51E0'] },
];

export function themeById(id: string): BoxTheme {
  return boxThemes.find((t) => t.id === id) ?? boxThemes[0];
}
