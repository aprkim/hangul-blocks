// GENERATED from measurements; see docs/SYLLABLE_SHAPES.md. Do not hand-tune single values.
//
// Where the consonant and the vowel sit in each syllable, as [x, y, w, h] boxes of stroke
// centerlines on the 100 x 100 frame. Measured from seven Korean sans fonts used in education
// and on screens (the Ministry of Education's 학교안심 바른돋움, 우주 and 산뜻돋움; 나눔고딕;
// 고운돋움; Noto Sans KR; Pretendard): each syllable was rendered, split into its consonant and
// vowel, normalized to the font's own letter body, and the median taken across the fonts in
// which the two parts do not touch (count in the comment).

export type Box = [number, number, number, number]

/** Keyed by consonant + vowel jamo, e.g. 'ㄱㅏ' for 가. */
export const SYLLABLE_BOXES: Record<string, { cons: Box; vowel: Box }> = {
  ㄱㅏ: { cons: [16, 20.5, 34.5, 46.5], vowel: [72.5, 12, 13, 75.5] }, // 가: 7 fonts
  ㄱㅑ: { cons: [16, 20.5, 34.5, 46.5], vowel: [72.5, 12, 13, 75.5] }, // 갸: 7 fonts
  ㄱㅓ: { cons: [16, 20.5, 34.5, 46.5], vowel: [56.5, 12, 19, 75.5] }, // 거: 7 fonts
  ㄱㅕ: { cons: [16, 22, 36, 46.5], vowel: [58.5, 12.5, 18.5, 75.5] }, // 겨: 3 fonts
  ㄱㅣ: { cons: [16.5, 20.5, 34.5, 46.5], vowel: [76, 12, 0, 75.5] }, // 기: 7 fonts
  ㄱㅗ: { cons: [23.5, 20, 50, 39.5], vowel: [14, 47, 70, 29.5] }, // 고: 7 fonts
  ㄱㅛ: { cons: [23.5, 20, 50.5, 39], vowel: [14, 47.5, 70, 28.5] }, // 교: 7 fonts
  ㄱㅜ: { cons: [24, 16, 51.5, 28.5], vowel: [13, 55.5, 72.5, 31.5] }, // 구: 2 fonts
  ㄱㅠ: { cons: [24, 16, 52, 28.5], vowel: [13, 55.5, 72.5, 32] }, // 규: 2 fonts
  ㄱㅡ: { cons: [24, 20.5, 48.5, 41.5], vowel: [15, 75.5, 68, 0] }, // 그: 5 fonts
  ㄴㅏ: { cons: [19, 20, 39.5, 46.5], vowel: [72.5, 12, 13, 75.5] }, // 나: 7 fonts
  ㄴㅑ: { cons: [18.5, 20, 39.5, 47], vowel: [72.5, 12, 12.5, 75.5] }, // 냐: 7 fonts
  ㄴㅓ: { cons: [20.5, 20, 39, 47], vowel: [51, 12, 25, 75.5] }, // 너: 7 fonts
  ㄴㅕ: { cons: [20, 20, 39, 48], vowel: [52, 12, 24.5, 75.5] }, // 녀: 7 fonts
  ㄴㅣ: { cons: [20.5, 20, 42, 46.5], vowel: [76, 12, 0, 75.5] }, // 니: 7 fonts
  ㄴㅗ: { cons: [25.5, 19.5, 48.5, 26], vowel: [12.5, 59, 73.5, 17.5] }, // 노: 1 font
  ㄴㅛ: { cons: [25.5, 19.5, 48.5, 25.5], vowel: [12.5, 60.5, 73.5, 17] }, // 뇨: 1 font
  ㄴㅜ: { cons: [25.5, 14.5, 49, 25], vowel: [14, 58, 70, 29.5] }, // 누: 7 fonts
  ㄴㅠ: { cons: [25, 14.5, 48.5, 25], vowel: [14, 57.5, 70, 30] }, // 뉴: 7 fonts
  ㄴㅡ: { cons: [24.5, 18.5, 49.5, 32], vowel: [14, 75.5, 70, 0] }, // 느: 7 fonts
  ㅁㅏ: { cons: [18.5, 20, 32, 46.5], vowel: [72.5, 12, 13.5, 75.5] }, // 마: 7 fonts
  ㅁㅑ: { cons: [18.5, 20, 32, 46.5], vowel: [72.5, 12, 13, 75.5] }, // 먀: 7 fonts
  ㅁㅓ: { cons: [18, 23, 34.5, 36], vowel: [60.5, 12.5, 16.5, 74.5] }, // 머: 1 font
  ㅁㅕ: { cons: [18, 23, 34, 36], vowel: [60, 12.5, 16.5, 74.5] }, // 며: 1 font
  ㅁㅣ: { cons: [20, 20, 32, 47], vowel: [76, 12, 0, 75.5] }, // 미: 7 fonts
  ㅁㅗ: { cons: [26.5, 19, 45, 29], vowel: [12.5, 60.5, 73.5, 17] }, // 모: 1 font
  ㅁㅛ: { cons: [26.5, 19, 45, 29], vowel: [12.5, 61, 73.5, 16.5] }, // 묘: 1 font
  ㅁㅜ: { cons: [25, 16, 48, 25.5], vowel: [14, 59, 70, 28] }, // 무: 7 fonts
  ㅁㅠ: { cons: [25, 16, 48, 26], vowel: [14, 59, 70, 28.5] }, // 뮤: 7 fonts
  ㅁㅡ: { cons: [24.5, 19, 49, 32.5], vowel: [14, 75.5, 70, 0] }, // 므: 7 fonts
  ㅂㅏ: { cons: [18.5, 19, 32.5, 49], vowel: [72.5, 12, 13.5, 75.5] }, // 바: 7 fonts
  ㅂㅑ: { cons: [18.5, 19, 32.5, 49], vowel: [72.5, 12, 13, 75.5] }, // 뱌: 7 fonts
  ㅂㅓ: { cons: [19, 20, 32, 41.5], vowel: [60, 12.5, 16.5, 74.5] }, // 버: 1 font
  ㅂㅕ: { cons: [19, 20, 32, 41.5], vowel: [60, 12.5, 16.5, 74.5] }, // 벼: 1 font
  ㅂㅣ: { cons: [20, 19, 33, 49], vowel: [76, 12, 0, 75.5] }, // 비: 7 fonts
  ㅂㅗ: { cons: [26.5, 16, 45, 34], vowel: [12.5, 62, 73.5, 15] }, // 보: 1 font
  ㅂㅛ: { cons: [26.5, 16, 45, 34], vowel: [12.5, 62, 73.5, 15.5] }, // 뵤: 1 font
  ㅂㅜ: { cons: [25, 14.5, 48, 29], vowel: [14, 60.5, 70, 27.5] }, // 부: 7 fonts
  ㅂㅠ: { cons: [25, 14.5, 48, 28.5], vowel: [14, 59.5, 70, 28] }, // 뷰: 7 fonts
  ㅂㅡ: { cons: [24.5, 16.5, 49, 36], vowel: [14, 76.5, 70, 0] }, // 브: 7 fonts
}

/** For consonants with no measured syllables yet: the median over the measured consonants, per vowel. */
export const VOWEL_BOXES: Record<string, { cons: Box; vowel: Box }> = {
  ㅏ: { cons: [18.5, 20, 33.5, 48], vowel: [72.5, 12, 13, 75.5] },
  ㅑ: { cons: [18.5, 20, 33.5, 48], vowel: [72.5, 12, 13, 75.5] },
  ㅓ: { cons: [18.5, 20.5, 34.5, 44], vowel: [58, 12.5, 18, 75] },
  ㅕ: { cons: [18.5, 21, 35, 44.5], vowel: [59, 12.5, 17.5, 75] },
  ㅣ: { cons: [20, 20, 33.5, 48], vowel: [76, 12, 0, 75.5] },
  ㅗ: { cons: [26, 19.5, 47, 31.5], vowel: [12.5, 59.5, 73.5, 17.5] },
  ㅛ: { cons: [26, 19.5, 47, 31.5], vowel: [12.5, 60.5, 73.5, 16.5] },
  ㅜ: { cons: [25, 15.5, 48.5, 27], vowel: [14, 58.5, 70, 29] },
  ㅠ: { cons: [25, 15, 48.5, 27], vowel: [14, 58.5, 70, 29.5] },
  ㅡ: { cons: [24.5, 18.5, 49, 34.5], vowel: [14, 75.5, 70, 0] },
}
