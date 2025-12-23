// Power of 9 card names mapping to their full art image paths
const powerOf9Cards = [
  { name: "Timetwister", artUrl: "/mtg_arena_power_cube/full_arts/timetwister_full.jpg" },
  { name: "Time Walk", artUrl: "/mtg_arena_power_cube/full_arts/time_walk_full.jpg" },
  { name: "Ancestral Recall", artUrl: "/mtg_arena_power_cube/full_arts/ancestral_recall_full.jpg" },
  { name: "Black Lotus", artUrl: "/mtg_arena_power_cube/full_arts/black_lotus_full.jpg" },
  { name: "Mox Emerald", artUrl: "/mtg_arena_power_cube/full_arts/mox_emerald_full.jpg" },
  { name: "Mox Jet", artUrl: "/mtg_arena_power_cube/full_arts/mox_jet_full.jpg" },
  { name: "Mox Pearl", artUrl: "/mtg_arena_power_cube/full_arts/mox_pearl_full.jpg" },
  { name: "Mox Ruby", artUrl: "/mtg_arena_power_cube/full_arts/mox_ruby_full.jpg" },
  { name: "Mox Sapphire", artUrl: "/mtg_arena_power_cube/full_arts/mox_sapphire_full.jpg" },
];

export type FullArtCardData = {
  name: string;
  artUrl: string;
};

export function loadPowerOf9(): FullArtCardData[] {
  return powerOf9Cards;
}
