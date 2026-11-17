"""Turn measure.json (ink components per font and syllable) into src/syllableBoxes.ts.

usage: python3 derive.py <dir with measure.json> <path to src/syllableBoxes.ts>
"""
import json, statistics as st, sys

S, OUT = sys.argv[1], sys.argv[2]
d = json.load(open(f'{S}/measure.json'))
SYL, out = d['SYL'], d['out']
# Sans fonts used in schools and on screens. Handwriting and display faces are left out.
EDU = ['bareondotum', 'wooju', 'santteut', 'nanumgothic', 'gowundodum', 'notosans', 'pretendard']
BODY = 76  # the letter body spans this much of the 100 frame (centerlines)

def union(bs):
    return {'x0': min(b['x0'] for b in bs), 'y0': min(b['y0'] for b in bs), 'x1': max(b['x1'] for b in bs), 'y1': max(b['y1'] for b in bs)}

perfont = {}
for n in EDU:
    per = out[n]
    parts = {}
    for s in SYL:
        c = per[s['ch']]
        if len(c) < 2:
            continue  # consonant and vowel touch in this font
        # The vowel is the piece with the long bar: tallest (side) or widest (stack). The rest is the consonant.
        size = (lambda b: b['y1'] - b['y0']) if s['side'] else (lambda b: b['x1'] - b['x0'])
        v = max(c, key=size)
        rest = [b for b in c if b is not v]
        parts[s['ch']] = (union(rest), v)
    tv = st.median([parts[ch][1]['x1'] - parts[ch][1]['x0'] for ch in '기니미비' if ch in parts])
    th = st.median([parts[ch][1]['y1'] - parts[ch][1]['y0'] for ch in '그느므브' if ch in parts])
    allc = [b for s in SYL for b in per[s['ch']]]
    gx0 = min(b['x0'] for b in allc) + tv / 2; gx1 = max(b['x1'] for b in allc) - tv / 2
    gy0 = min(b['y0'] for b in allc) + th / 2; gy1 = max(b['y1'] for b in allc) - th / 2
    k = BODY / max(gx1 - gx0, gy1 - gy0); cx = (gx0 + gx1) / 2; cy = (gy0 + gy1) / 2
    def norm(b):
        x0 = b['x0'] + tv / 2; x1 = max(b['x1'] - tv / 2, x0); y0 = b['y0'] + th / 2; y1 = max(b['y1'] - th / 2, y0)
        return [50 + (x0 - cx) * k, 50 + (y0 - cy) * k, (x1 - x0) * k, (y1 - y0) * k]
    normed = {ch: (norm(a), norm(b)) for ch, (a, b) in parts.items()}
    # A piece of the consonant can fuse with the vowel (the circle of ㅎ onto ㅗ's stub), leaving a
    # consonant that is far too small: drop measurements well under that font's median for the vowel.
    vowel_of = {s['ch']: s['v'] for s in SYL}
    for v in set(vowel_of.values()):
        chs = [ch for ch in normed if vowel_of[ch] == v]
        mw = st.median([normed[ch][0][2] for ch in chs]); mh = st.median([normed[ch][0][3] for ch in chs])
        for ch in chs:
            if normed[ch][0][2] < 0.6 * mw or normed[ch][0][3] < 0.6 * mh:
                del normed[ch]
    perfont[n] = normed

r = lambda v: round(v * 2) / 2
fmt = lambda b: '[' + ', '.join(('%g' % r(x)) for x in b) + ']'
# Pass 1: the median over the fonts in which consonant and vowel stand apart.
MIN_FONTS = 3  # fewer than this is one font's quirk, not a consensus
SIBLING = dict(zip('ㅏㅑㅓㅕㅗㅛㅜㅠ', 'ㅑㅏㅕㅓㅛㅗㅠㅜ'))
bykey = {(s['c'], s['v']): s['ch'] for s in SYL}
measured = {}
for s in SYL:
    have = [perfont[n][s['ch']] for n in EDU if s['ch'] in perfont[n]]
    med = lambda i: [st.median([h[i][j] for h in have]) for j in range(4)]
    measured[(s['c'], s['v'])] = (med(0), med(1), len(have)) if have else (None, None, 0)

# Per-vowel medians, from well-measured syllables only.
byv = {}
for (c, v), (cons, vowel, n) in measured.items():
    if n >= MIN_FONTS:
        byv.setdefault(v, []).append((cons, vowel))
VOWEL = {v: tuple([st.median([e[i][j] for e in es]) for j in range(4)] for i in (0, 1)) for v, es in byv.items()}

# Pass 2: syllables most fonts draw with the parts touching (어, 여, 머, 오, 보...) were left with
# one or two fonts, and one font's quirk is not a consensus (여's ㅇ came out small and high).
# Those are built from well-measured neighbors instead: the consonant keeps its own size from
# its reference syllable (아-row beside a vowel, 으-row above one) and takes the room this vowel
# leaves (the per-vowel median), so the same consonant looks the same from row to row.
REF = {True: 'ㅏ', False: 'ㅡ'}
lines, derived = [], []
for s in SYL:
    c, v, side = s['c'], s['v'], s['side']
    cons, vowel, n = measured[(c, v)]
    note = f"{n} font{'s' if n != 1 else ''}"
    if n < MIN_FONTS:
        vc, vv = VOWEL[v]
        rc, _, rn = measured[(c, REF[side])]
        if rn >= MIN_FONTS:
            # beside the vowel: across = the vowel's room, up-down = the consonant's own
            cons = [vc[0], rc[1], vc[2], rc[3]] if side else [rc[0], vc[1], rc[2], vc[3]]
        else:
            cons = list(vc)
        vowel = list(vv)
        note = f"derived (only {n} font{'s' if n != 1 else ''} measured)"
        derived.append(s['ch'])
    if c == 'ㄱ' and side:
        cons[3] *= 0.9  # ㄱ stays straight for children; a straight stem reads heavier than a sweep
    lines.append(f"  {c}{v}: {{ cons: {fmt(cons)}, vowel: {fmt(vowel)} }}, // {s['ch']}: {note}")
vl = [f"  {v}: {{ cons: {fmt(VOWEL[v][0])}, vowel: {fmt(VOWEL[v][1])} }}," for v in VOWEL]
missing = derived
open(OUT, 'w').write("""// GENERATED by scripts/syllable-boxes (see docs/SYLLABLE_SHAPES.md). Do not hand-tune single values.
//
// Where the consonant and the vowel sit in each syllable, as [x, y, w, h] boxes of stroke
// centerlines on the 100 x 100 frame. Measured from seven Korean sans fonts used in education
// and on screens (the Ministry of Education's 학교안심 바른돋움, 우주 and 산뜻돋움; 나눔고딕;
// 고운돋움; Noto Sans KR; Pretendard): each syllable was rendered, split into its consonant and
// vowel, normalized to the font's own letter body, and the median taken across the fonts in
// which the two parts do not touch (count in the comment). Where fewer than three fonts keep
// them apart, the box is derived from well-measured neighbors (see derive.py).

export type Box = [number, number, number, number]

/** Keyed by consonant + vowel jamo, e.g. 'ㄱㅏ' for 가. */
export const SYLLABLE_BOXES: Record<string, { cons: Box; vowel: Box }> = {
""" + '\n'.join(lines) + """
}

/** Per vowel: the median over its well-measured syllables. */
export const VOWEL_BOXES: Record<string, { cons: Box; vowel: Box }> = {
""" + '\n'.join(vl) + """
}
""")
print('syllables:', len(lines), '| derived from neighbors:', len(derived), ''.join(derived))
