// Import all card list files
import blackCards from '/mtg_arena_power_cube/cards/black.txt?raw';
import blueCards from '/mtg_arena_power_cube/cards/blue.txt?raw';
import colorlessCards from '/mtg_arena_power_cube/cards/colorless.txt?raw';
import doubleSidedCards from '/mtg_arena_power_cube/cards/double_sided.txt?raw';
import greenCards from '/mtg_arena_power_cube/cards/green.txt?raw';
import landsCards from '/mtg_arena_power_cube/cards/lands.txt?raw';
import multiCards from '/mtg_arena_power_cube/cards/multi.txt?raw';
import powerOf9Cards from '/mtg_arena_power_cube/cards/power_of_9.txt?raw';
import redCards from '/mtg_arena_power_cube/cards/red.txt?raw';
import whiteCards from '/mtg_arena_power_cube/cards/white.txt?raw';

export function parsePowerCubeList(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export const cardLists = {
  'Power of 9': parsePowerCubeList(powerOf9Cards),
  'White': parsePowerCubeList(whiteCards),
  'Blue': parsePowerCubeList(blueCards),
  'Black': parsePowerCubeList(blackCards),
  'Red': parsePowerCubeList(redCards),
  'Green': parsePowerCubeList(greenCards),
  'Multicolor': parsePowerCubeList(multiCards),
  'Colorless': parsePowerCubeList(colorlessCards),
  'Lands': parsePowerCubeList(landsCards),
  'Double-Sided': parsePowerCubeList(doubleSidedCards),
};

export type CardListName = keyof typeof cardLists;

export function loadCardList(listName: CardListName): string[] {
  return cardLists[listName];
}

export function loadAllPowerCubeCards(): string[] {
  return Object.values(cardLists).flat();
}
