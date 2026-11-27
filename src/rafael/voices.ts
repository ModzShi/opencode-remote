export interface FishVoice {
  id: string;
  name: string;
  lang: string;
}

/** Vozes públicas do Fish Audio (id, nome e idiomas). */
export const FISH_VOICES: FishVoice[] = [
  { id: '620fbba75326480b8aa6bae8974ace0c', name: "Rafael (voz atual)", lang: 'pt' },
  { id: '0b12d715e4c741399594fccb12d4bbe2', name: "São Cipriano", lang: 'pt' },
  { id: '04736e4d6a644abab81e601a7d2ae4b9', name: "Waldo Morais", lang: 'pt' },
  { id: '94e794d95de94a38864d1d8930d903a5', name: "Skeeper en español latino", lang: 'es/pt/en/hi' },
  { id: 'a4ac1426e4a749839c86853ad613eebe', name: "Lula", lang: 'pt' },
  { id: '1e17dc57eaba4f27ac3ee8d50cb8d040', name: "Steal a Brainrot (Brainrots Voice)", lang: 'sw/en/fr/es/ro/el/pt/it/ru/tl/sv' },
  { id: '09ec7ce1e36349049f18115192e6282a', name: "Pomni", lang: 'pt/lv/es' },
  { id: 'ca2ded615b7243629317ef7c804c6e56', name: "a2ksi", lang: 'pt' },
  { id: '102bccca7dc64b6b8f8494c199c5d153', name: "Capitão Nascimento", lang: 'pt' },
  { id: '3a164c7d00b2437682042ebd01755521', name: "sukuna", lang: 'pt' },
  { id: '2d7d220a6f44440da76a8b969318c19c', name: "Gojo", lang: 'pt' },
  { id: 'df1fa6d2ae194b3ebcbae60df48fde35', name: "Narrador Propagandas", lang: 'pt' },
  { id: '3351971c57f64d14ada2628fdc770112', name: "Fluttershy", lang: 'pt' },
  { id: '90e65eaaf50e4470b8e6d43ee6afd7d5', name: "Super Smash Bros. 4/Ultimate Announcer", lang: 'en' },
  { id: '52e0660e03fe4f9a8d2336f67cab5440', name: "ALEX_CHIKNA", lang: 'en' },
  { id: '933563129e564b19a115bedd57b7406a', name: "Sarah", lang: 'en' },
  { id: 'd13f84b987ad4f22b56d2b47f4eb838e', name: "Mortal Kombat", lang: 'en' },
  { id: 'acc8237220d8470985ec9be6c4c480a9', name: "Hatsune Miku (Text To Speech)", lang: 'es/en' },
  { id: '6dc11f3f67a543f6ad4537a4a347e224', name: "Mita Miside (Russian voice)", lang: 'en/ru' },
  { id: '35a41c4c9e754e49a124a4bab5aa47e6', name: "Energetic Crowd", lang: 'en' },
  { id: '98655a12fa944e26b274c535e5e03842', name: "E-girl", lang: 'en' },
  { id: 'b347db033a6549378b48d00acb0d06cd', name: "Selene", lang: 'en' },
  { id: 'bf322df2096a46f18c579d0baa36f41d', name: "Adrian", lang: 'en' },
  { id: 'ef9c79b62ef34530bf452c0e50e3c260', name: "horror", lang: 'en' },
  { id: '802e3bc2b27e49c2995d23ef70e6ac89', name: "Energetic Male", lang: 'en' },
  { id: 'e9e9d36027424e55ac3faa620f78a72b', name: "a2ksi", lang: 'en' },
  { id: 'f48d143a59a946ab87c0130fd081f349', name: "Polo", lang: 'en' },
  { id: '536d3a5e000945adb7038665781a4aca', name: "Ethan", lang: 'en' },
  { id: '92565bd2b241473eb8255cf392323cf4', name: "Smash Bros", lang: 'en' },
  { id: '711cf3ed00ab441a8f54a45058047b7a', name: "Verity", lang: 'en' },
];

export const DEFAULT_VOICE_ID = FISH_VOICES[0].id;

export function findVoice(id?: string | null): FishVoice {
  return FISH_VOICES.find((voice) => voice.id === id) ?? FISH_VOICES[0];
}
