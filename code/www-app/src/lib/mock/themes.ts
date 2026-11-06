export type BoxTheme = {
  id: string;
  name: string;
  emoji: string;
  gradient: readonly [string, string];
};

export const boxThemes: BoxTheme[] = [
  { id: 'crochet', name: 'Crochet', emoji: '🧶', gradient: ['#EF476F', '#A62943'] },
  { id: 'tricot', name: 'Tricot', emoji: '🧣', gradient: ['#3C7E86', '#2E5E63'] },
  { id: 'broderie', name: 'Broderie', emoji: '🪡', gradient: ['#D2607A', '#A62943'] },
  { id: 'macrame', name: 'Macramé', emoji: '🪢', gradient: ['#B37F44', '#6D4D2E'] },
  { id: 'peinture', name: 'Peinture par numéros', emoji: '🎨', gradient: ['#F9C74F', '#C79A2A'] },
  { id: 'bijoux', name: 'Bijoux en perles', emoji: '📿', gradient: ['#8FBFA0', '#4E6E58'] },
  { id: 'origami', name: 'Origami', emoji: '🦢', gradient: ['#F2A0B5', '#EF476F'] },
  { id: 'scrapbooking', name: 'Scrapbooking', emoji: '📔', gradient: ['#E8A87C', '#C4766A'] },
  { id: 'argile', name: 'Modelage argile', emoji: '🏺', gradient: ['#A9836B', '#6D4D2E'] },
  { id: 'bougies', name: 'Bougies', emoji: '🕯️', gradient: ['#F4B942', '#D9922F'] },
  { id: 'savonnerie', name: 'Savonnerie', emoji: '🧼', gradient: ['#7FC6D6', '#3C7E86'] },
  { id: 'aquarelle', name: 'Aquarelle', emoji: '🖌️', gradient: ['#6FB8CF', '#7D6FB3'] },
];

export function themeById(id: string): BoxTheme {
  return boxThemes.find((t) => t.id === id) ?? boxThemes[0];
}
