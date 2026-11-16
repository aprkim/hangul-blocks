import json, statistics as st, sys
S=sys.argv[1]
d=json.load(open(f'{S}/measure.json'))
SYL=d['SYL']; out=d['out']
EDU=['bareondotum','wooju','santteut','nanumgothic','gowundodum','notosans','pretendard']
res={}
perfont={}
for n in EDU:
    per=out[n]
    # split into (cons, vowel) where separable
    parts={}
    for s in SYL:
        c=per[s['ch']]
        if len(c)!=2: continue
        key=(lambda b:(b['x0']+b['x1'])/2) if s['side'] else (lambda b:(b['y0']+b['y1'])/2)
        a,b=sorted(c,key=key)
        parts[s['ch']]=(a,b)
    # thickness
    tv=st.median([parts[ch][1]['x1']-parts[ch][1]['x0'] for ch in '기니미비' if ch in parts])
    th=st.median([parts[ch][1]['y1']-parts[ch][1]['y0'] for ch in '그느므브' if ch in parts])
    # global ink box over all syllables
    allc=[b for s in SYL for b in per[s['ch']]]
    gx0=min(b['x0'] for b in allc)+tv/2; gx1=max(b['x1'] for b in allc)-tv/2
    gy0=min(b['y0'] for b in allc)+th/2; gy1=max(b['y1'] for b in allc)-th/2
    k=76/max(gx1-gx0,gy1-gy0); cx=(gx0+gx1)/2; cy=(gy0+gy1)/2
    def norm(b):
        x0=b['x0']+tv/2; x1=b['x1']-tv/2; y0=b['y0']+th/2; y1=b['y1']-th/2
        x1=max(x1,x0); y1=max(y1,y0)
        return [50+(x0-cx)*k, 50+(y0-cy)*k, (x1-x0)*k, (y1-y0)*k]
    perfont[n]={ch:(norm(a),norm(b)) for ch,(a,b) in parts.items()}
    print(n,'thickness %% of body: v %.1f h %.1f'%(tv*k, th*k), 'body w/h %.2f'%((gx1-gx0)/(gy1-gy0)))
final={}
for s in SYL:
    ch=s['ch']
    have=[perfont[n][ch] for n in EDU if ch in perfont[n]]
    med=lambda i,j:round(st.median([h[i][j] for h in have]),1)
    final[ch]={'cons':[med(0,j) for j in range(4)],'vowel':[med(1,j) for j in range(4)],'n':len(have),'c':s['c'],'v':s['v']}
json.dump(final,open(f'{S}/boxes.json','w'),ensure_ascii=False)
for ch,f in final.items(): print(ch,f['n'],'cons',f['cons'],'vowel',f['vowel'])
