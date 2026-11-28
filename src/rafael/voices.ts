export interface FishVoice {
  id: string;
  name: string;
  /** idioma principal da voz (código ISO de 2 letras, igual ao Fish) */
  lang: string;
}

/**
 * Vozes em português do catálogo público do Fish Audio, ordenadas por popularidade.
 * Gerado a partir de https://api.fish.audio/model (todas as 94 vozes pt disponíveis).
 */
export const FISH_VOICES: FishVoice[] = [
  { id: '620fbba75326480b8aa6bae8974ace0c', name: 'Rafael (sua voz)', lang: 'pt' },
  { id: '0b12d715e4c741399594fccb12d4bbe2', name: 'São Cipriano', lang: 'pt' },
  { id: '04736e4d6a644abab81e601a7d2ae4b9', name: 'Waldo Morais', lang: 'pt' },
  { id: '94e794d95de94a38864d1d8930d903a5', name: 'Skeeper en español latino', lang: 'pt' },
  { id: 'a4ac1426e4a749839c86853ad613eebe', name: 'Lula', lang: 'pt' },
  { id: '1e17dc57eaba4f27ac3ee8d50cb8d040', name: 'Steal a Brainrot (Brainrots Voice)', lang: 'pt' },
  { id: '09ec7ce1e36349049f18115192e6282a', name: 'Pomni', lang: 'pt' },
  { id: 'ca2ded615b7243629317ef7c804c6e56', name: 'a2ksi', lang: 'pt' },
  { id: '102bccca7dc64b6b8f8494c199c5d153', name: 'Capitão Nascimento', lang: 'pt' },
  { id: '3a164c7d00b2437682042ebd01755521', name: 'sukuna', lang: 'pt' },
  { id: '2d7d220a6f44440da76a8b969318c19c', name: 'Gojo', lang: 'pt' },
  { id: 'df1fa6d2ae194b3ebcbae60df48fde35', name: 'Narrador Propagandas', lang: 'pt' },
  { id: '3351971c57f64d14ada2628fdc770112', name: 'Fluttershy', lang: 'pt' },
  { id: 'dece2a4c7f8d476b8da3c3a6707298d4', name: 'Goku', lang: 'pt' },
  { id: '5661bf8cb97740fcb10d2f756abf7779', name: 'Isabela', lang: 'pt' },
  { id: 'ea3bf7f7c7af4b59be4715013e1c4428', name: 'Mita (PTBR (PT-BR) (Brasil)', lang: 'pt' },
  { id: 'a5b93aeddcc948c19ea04f0afe9d178c', name: 'Jarvis (UCM) - Português Brasileiro', lang: 'pt' },
  { id: '1a61293f8fa8441f804deb10d0b2bc95', name: 'Adam', lang: 'pt' },
  { id: 'e43aaac9114549edbfbfa1e4b861ed49', name: 'Парень', lang: 'pt' },
  { id: '01b057e7592b4b97a6963423f91f5e22', name: 'Bob esponja', lang: 'pt' },
  { id: '95e01d953caa4e6498d51635808c0da9', name: 'ALBERTO ACOSTA', lang: 'pt' },
  { id: '7344de0f70a84483975a5163f2a21837', name: 'tiktok curiosidades', lang: 'pt' },
  { id: '2fcea8b2e83540fab786983017af01af', name: 'rodolfo oração', lang: 'pt' },
  { id: '2bd0cd1a49474aeab129894f4512e8a6', name: 'Neymar', lang: 'pt' },
  { id: '85ecdf7683d64d0884d818971dbfddb4', name: 'Cid Moreira Ai 01', lang: 'pt' },
  { id: '4d72497e3ceb4c75a7c5563900975afd', name: 'Narração Contos de Terror', lang: 'pt' },
  { id: 'ffe41701970d4b339ef7906300716f99', name: 'Anya', lang: 'pt' },
  { id: '24522123b5804bf691a8450d9187f03e', name: 'Garota fofa', lang: 'pt' },
  { id: '7c29d3e923b44be1b3de8f40581819ef', name: 'Homem aranha', lang: 'pt' },
  { id: 'b59c8403f2354d46ba0003589b947316', name: 'NARRAÇÃO VOZ GROSSA', lang: 'pt' },
  { id: '7fe10a00249247aabb495bae57ac80e1', name: 'Galvão Bueno', lang: 'pt' },
  { id: 'f105557f5588463993a92c2dab364544', name: 'Locutor impacto do brasil', lang: 'pt' },
  { id: '0889ee96fd82421b8ad9e126c4d73312', name: 'Iberê Thenório (Manual do Mundo)', lang: 'pt' },
  { id: '0ba1afd27db44eb2b4cb27fd331b93aa', name: 'Narrador de Historias e Ciências', lang: 'pt' },
  { id: 'ecb37eaae11944719577bf7d3877eebd', name: 'Shinobu', lang: 'pt' },
  { id: '96a2c896ed7846848cdd83e484b23eb3', name: 'Satoru Gojo', lang: 'pt' },
  { id: '1573caa3d6444e16a28eab1f094e1416', name: 'Putinha 1', lang: 'pt' },
  { id: '1d8cb595b6284ff7aa7e8fec7b93249d', name: 'Modelo 01', lang: 'pt' },
  { id: 'ba23a5c7ba41404188f937d78a4b159a', name: 'Bolsonaro 2.0', lang: 'pt' },
  { id: 'b7105f831b9644f28b0a92e004d9fd94', name: 'Sunny rants', lang: 'pt' },
  { id: '5ff77a8b3143479f99f73ae6d2c88b09', name: 'Camila Fabri', lang: 'pt' },
  { id: 'ea05dafdf78c4834a8b94a3dcb763843', name: 'waldo', lang: 'pt' },
  { id: 'bcb3ac264a124959a52c762a9ccb4ae2', name: 'Naruto BR', lang: 'pt' },
  { id: '2bb270d0dc344007b53ae25cd00a4e85', name: 'Itoshi sae', lang: 'pt' },
  { id: '4744963f03b24efeb8e29b86aca419a0', name: 'Bolsonaro Ex Presidente do Brasil', lang: 'pt' },
  { id: '7d10631996b34312823758ed8fc41681', name: 'Simple - 03 mulher novinha', lang: 'pt' },
  { id: '24c2c79c666a4211baafc29de0cea1c6', name: 'Sukuna', lang: 'pt' },
  { id: '8301da3c6de141a188eb4b18a9adb787', name: 'menina', lang: 'pt' },
  { id: '020ae7c097e644878745ae909ffaad15', name: 'Sonic BR', lang: 'pt' },
  { id: 'ed827b0532324b12803bb9344a3a607f', name: 'Bolsonaro', lang: 'pt' },
  { id: 'a7f67c4e2d94440aad9c5a82365d9d92', name: 'Filmora alex', lang: 'pt' },
  { id: 'ceaf7f569bef42c7bd322d88e3a356b7', name: 'Mulher do Criativo top', lang: 'pt' },
  { id: 'af1d2052ea8d441a972ca51a5bf547e4', name: 'Michael Jackson', lang: 'pt' },
  { id: 'e8d514263b0e46bcba8efeec1b0b25fc', name: 'bibo bolseiro, um humilde hobbit.', lang: 'pt' },
  { id: 'a2e2bed323bd4a3a88e9b05117a4ba73', name: 'Hatsune Miku', lang: 'pt' },
  { id: 'd075373d4c584273b71f38d3148600c3', name: 'Katherine Pierce', lang: 'pt' },
  { id: '65ce08eac21b46bd8c9c29ab96b6f55a', name: 'Kasane teto', lang: 'pt' },
  { id: '767ca9e6962a4bce99538eb3b54e008f', name: 'Carlinha', lang: 'pt' },
  { id: 'd339e19362fc42dc8e3f4a6be653ff83', name: 'Naruto (criança)', lang: 'pt' },
  { id: '51f868b27c454c5fb03db8b4165ced82', name: 'Sukuna - Jujutsu Kaisen', lang: 'pt' },
  { id: '23582b7e1db44054bb522f19c9def4c8', name: 'Gojo', lang: 'pt' },
  { id: '572760b7d9ec4a369ca387dad720a828', name: 'Locutor', lang: 'pt' },
  { id: 'ed7de8309b7f4643932df8f4b56ac988', name: 'Lula', lang: 'pt' },
  { id: 'befa4b55cf55459a89c56dab73bbe8b0', name: 'Hatisune miku', lang: 'pt' },
  { id: '1a975db6f1be40f4bed2bcc5e495301d', name: 'Patrick Jane', lang: 'pt' },
  { id: '59f817d7b8b64ed19b326cecbfe7e023', name: 'Megumi', lang: 'pt' },
  { id: 'a77c3b29025d4166b487205b4eb7fa5b', name: 'Naruto (criança)', lang: 'pt' },
  { id: '1f7c937ef3534107aea722e20934ca47', name: 'Twilight Sparkle', lang: 'pt' },
  { id: 'ca0326921a254a7295650b2cf85fe098', name: 'Simple - mulher de 30 anos', lang: 'pt' },
  { id: 'd84c7e351cde4d81ad5ed1d88ec1453c', name: 'mulher', lang: 'pt' },
  { id: 'd65c6d85022b46458b9d2347769c0766', name: 'todo mundo odeia o crhis', lang: 'pt' },
  { id: '4e8e6f7ce2b4444bacdc8b9f47922657', name: 'L LAWLIET', lang: 'pt' },
  { id: '713f7cec1ced4ecfb6daa6ef31ab81f0', name: 'Gojo', lang: 'pt' },
  { id: 'ac63ad94686b41b3a8e526cc82a99587', name: 'Todo mundo odeia o Chris', lang: 'pt' },
  { id: 'd1a0a1cbc4704f56afd4e38e55a5b002', name: 'rdofolfo oração', lang: 'pt' },
  { id: 'ba72c1300ed14630b21aa017e341fdd9', name: 'valentino portugues', lang: 'pt' },
  { id: 'aedb06f6daa84a1db52c7479c7235910', name: 'Sasuke', lang: 'pt' },
  { id: '9b73610d862a45de97812ca27e079378', name: 'naruto', lang: 'pt' },
  { id: '8b9c7b29c75b4198aba8cc0457cd2030', name: 'BOB ESPONJA', lang: 'pt' },
  { id: '507bee08fbcd4180b7ae1c82ccb94bf5', name: 'Seishiro nagi', lang: 'pt' },
  { id: 'b1909f6b79e74e1eb54a77023634a6d8', name: 'Bachira', lang: 'pt' },
  { id: '75ee4321872340c8bc2e7ea642ff2db8', name: 'Bachira', lang: 'pt' },
  { id: 'ebbfcf7d5e8f41d99bdcb80348bc0e5c', name: 'BOLSONARO', lang: 'pt' },
  { id: '754bf7e74a15494b8b622ba978d12c02', name: 'Pinkie pie', lang: 'pt' },
  { id: '84c748173dc14017a29c99ff7feb4d32', name: 'adam', lang: 'pt' },
  { id: '4b02d057165c4798b0ceba194b765e90', name: 'alex jovem', lang: 'pt' },
  { id: 'f800d4c9e73b4dbd849be082315629c4', name: 'Cristiano Ronaldo', lang: 'pt' },
  { id: '2e51421379b24fb69a29e9aba04e7b8a', name: 'CAVA 2 IMPACTO', lang: 'pt' },
  { id: '75242fd44c2d4a17b19fda165ed110dd', name: 'morty', lang: 'pt' },
  { id: 'b0ddac03a66e47e2a6e5b49c15240ce6', name: 'Gojo', lang: 'pt' },
  { id: 'a4c03cb5d4b344c797c8db25e87606dc', name: 'Matheus', lang: 'pt' },
  { id: '03236309a7034f9f9683bd20a5c4f7a4', name: 'Naoya', lang: 'pt' },
  { id: 'ffbf65f4fb1e44c69ad9710bcd66f23c', name: 'WALDO MORAES', lang: 'pt' },
  { id: '0e6c90199fd64dfdbc499583672dc3fb', name: 'Rick', lang: 'pt' },
  { id: 'eb81775a43bc469dafda02de59d13cb7', name: 'julia', lang: 'pt' },
];

export const DEFAULT_VOICE_ID = '620fbba75326480b8aa6bae8974ace0c';

export function findVoice(id?: string | null): FishVoice | undefined {
  return FISH_VOICES.find((voice) => voice.id === id);
}

export function voiceLabel(id?: string | null): string {
  return findVoice(id)?.name ?? 'Rafael (sua voz)';
}
