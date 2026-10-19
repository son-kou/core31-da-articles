# 音频覆盖报告

自动生成（`python3 scripts/audio/build_audio.py` → `npx tsx scripts/audio-report.ts`）。没有调用任何 TTS 或付费 API。

## 结论

- **全文音频：31/31 单元**，即原有的 `V3_CORE_AUDIO/Uxx_CORE.mp3`（逐字节复制，未重新合成）。
- **单句音频：1618/1725 句（93.8%）经过验证**，其中 14 句是本次通过独立复核“救回”的。
- 其余 107 句**不提供单句播放**（按钮置灰），也不在听力模式里高亮——宁缺毋错。这些句子在全文音频里都能听到。

## 验证方法

1. 句子边界来自 Anki 整合阶段的离线对齐（`V3_ANKI_INTEGRATION/WORK/audio_align/Uxx_LINES_EXACT.tsv`）：边界必须落在无损 WAV 中检测到的停顿里，并且与本地 ASR（faster-whisper small）的词间隙吻合。按字数比例估算的 `*_LINES_APPROX.tsv` 从未使用。
2. 对齐行的原句与文本 SHA-256 必须与冻结 CORE 完全一致；分段 WAV 的 SHA-256 必须与对齐时相同。
3. 从无损分段 WAV 切出 MP3（CBR 48 kbps，单声道，24 kHz，与 Anki 版相同），检查可完整解码、长度等于验证区间（±0.08 s）、首尾静音 ≤ 0.35 s。
4. **独立复核**：单独转写每个片段，与冻结原句的字母相似度 ≥ 0.80，且首尾各 10 个字母相似度 ≥ 0.6（防止截掉开头或结尾）。
5. 网站构建前 `npm run validate:audio` 再次核对：片段文件 SHA-256、句子文本哈希、区间顺序与时长。

“全文跟随高亮”使用同一批经过验证的区间（分段在全文 MP3 中的偏移 + 句内边界），未验证的句子不高亮。

## 各单元

| 单元 | 全文时长 | 单句音频 | 缺失 |
|---|---|---|---|
| U00 | 6:53 | 67/72 | 5 |
| U01 | 8:13 | 81/91 | 10 |
| U02 | 7:42 | 79/83 | 4 |
| U03 | 7:20 | 69/76 | 7 |
| U04 | 8:32 | 86/91 | 5 |
| U05 | 4:58 | 45/47 | 2 |
| U06 | 6:57 | 59/60 | 1 |
| U07 | 4:45 | 36/36 | 0 |
| U08 | 7:30 | 63/74 | 11 |
| U09 | 6:38 | 57/58 | 1 |
| U10 | 4:33 | 37/40 | 3 |
| U11 | 8:22 | 70/76 | 6 |
| U12 | 5:05 | 41/43 | 2 |
| U13 | 5:58 | 49/51 | 2 |
| U14 | 4:49 | 40/44 | 4 |
| U15 | 5:22 | 49/55 | 6 |
| U16 | 6:10 | 50/55 | 5 |
| U17 | 4:49 | 43/44 | 1 |
| U18 | 5:06 | 47/48 | 1 |
| U19 | 5:04 | 45/48 | 3 |
| U20 | 3:57 | 25/29 | 4 |
| U21 | 4:11 | 27/30 | 3 |
| U22 | 4:50 | 41/41 | 0 |
| U23 | 5:35 | 45/50 | 5 |
| U24 | 6:40 | 58/62 | 4 |
| U25 | 4:30 | 37/38 | 1 |
| U26 | 5:16 | 48/48 | 0 |
| U27 | 5:33 | 45/45 | 0 |
| U28 | 7:10 | 64/69 | 5 |
| U29 | 7:02 | 60/64 | 4 |
| U30 | 6:39 | 55/57 | 2 |

## 没有单句音频的句子（107）

| 句子 | 原文 | 原因 |
|---|---|---|
| U00-C042 | Mikkel: Hvad koster det? | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U00-C043 | Sara: Et par hundrede kroner om måneden. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U00-C044 | Mikkel: Så køb det bare. Du ved bedst, hvad du har brug for. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U00-C046 | Mikkel: Du spørger jo mig nu. | 切出的片段独立复核未通过（recheck sim=0.61 edges=False） |
| U00-C065 | Klogere er det at lære, hvor grænserne går. | 切出的片段独立复核未通过（recheck sim=0.81 edges=False） |
| U01-C005 | Ida: Nej! | 片段过短，无法独立验证 |
| U01-C011 | Ida: Okay da. | 片段过短，无法独立验证 |
| U01-C012 | Jonas: Nu skal jeg løbe. Jeg har vagt i morgen tidlig, så det er dig, der afleverer, ikke? | 切出的片段独立复核未通过（recheck sim=0.89 edges=False） |
| U01-C016 | Afleveringen i vuggestuen tager sjældent mere end fem minutter, men den har sin egen lille ceremoni. | 切出的片段独立复核未通过（recheck sim=0.89 edges=False） |
| U01-C017 | Skoene skal af, skiftetøjet skal i kurven, og pædagogen skal have at vide, at Emil har sovet dårligt i nat. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U01-C018 | Først da kan Maja cykle videre til stationen. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U01-C054 | Jonas laver mad om tirsdagen, Maja om torsdagen, og resten af ugen skiftes de efter behov. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U01-C055 | Arbejdet i hjemmet er gennem de sidste årtier blevet mere ligeligt fordelt, men kvinder bruger stadig i gennemsnit mere tid på husarbejde end mænd. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U01-C058 | Emil: Jo! Banan. | 切出的片段独立复核未通过（recheck sim=0.71 edges=True） |
| U01-C064 | Ida: Fedt! Så får vi pandekager. | 切出的片段独立复核未通过（recheck sim=0.70 edges=False） |
| U02-C061 | Sofie: Løg, hvidløg, tomater, ingefær og en masse spidskommen. Og så en smule citron til sidst. | 切出的片段独立复核未通过（recheck sim=0.94 edges=False） |
| U02-C074 | Line: Nej, jeg er vel nærmere … fleksitar. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U02-C075 | Bent: Fleksi-hvad? | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U02-C076 | Sofie: Én, der mest spiser grønt, far. Skal du have lidt mere? | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U03-C027 | Endelig er der de almene boliger, hvor huslejen skal dække udgifterne, men ikke give overskud til en ejer. | 切出的片段独立复核未通过（recheck sim=0.92 edges=False） |
| U03-C036 | Det var Erik fra stuen, der har boet i ejendommen i over fyrre år. | 切出的片段独立复核未通过（recheck sim=0.85 edges=False） |
| U03-C051 | Nadia: Skal jeg være hjemme? | 切出的片段独立复核未通过（recheck sim=0.47 edges=False） |
| U03-C068 | Thomas: Hundrede kroner. | 切出的片段独立复核未通过（recheck sim=0.79 edges=True） |
| U03-C069 | Kvinden: Jeg giver halvtreds. | 切出的片段独立复核未通过（recheck sim=0.64 edges=False） |
| U03-C071 | Kvinden: Fint. Har du MobilePay? | 切出的片段独立复核未通过（recheck sim=0.36 edges=False） |
| U03-C072 | Thomas: Selvfølgelig. | 切出的片段独立复核未通过（recheck sim=0.65 edges=False） |
| U04-C034 | Man kan have sommerfugle i maven før en date, få en klump i halsen ved et bryllup eller koge over af raseri. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U04-C035 | Tårer er heller ikke kun et tegn på sorg: Mange græder af glæde, af lettelse eller af ren og skær træthed. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U04-C037 | Mange danskere har en vennekreds fra barndommen, gymnasiet eller studiet, og når man er omkring de tredive, kan den virke svær at komme ind i. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U04-C038 | Nye bekendtskaber bliver sjældent inviteret hjem efter et første møde, og en hyggelig samtale i toget fører ikke nødvendigvis til mere. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U04-C069 | Derfor kan den ikke måles ved at tælle venner. | 切出的片段独立复核未通过（recheck sim=0.86 edges=False） |
| U05-C001 | »Jeg kom egentlig bare for at se min datter spille håndbold. Nu har jeg siddet i bestyrelsen i elleve år.« | 切出的片段独立复核未通过（recheck sim=0.94 edges=False） |
| U05-C038 | Birgitte: Nemlig. | 切出的片段独立复核未通过（recheck sim=0.50 edges=False） |
| U06-C006 | Aisha: Tillykke med fødselsdagen, Pernille! | 切出的片段独立复核未通过（recheck sim=0.75 edges=True） |
| U08-C003 | Hej Line! Er du frisk på en gåtur søndag? Jeg kan først efter kl. 14, for jeg skal hjælpe min mor med at flytte. Kram, A | 切出的片段独立复核未通过（recheck sim=0.94 edges=False） |
| U08-C004 | At være frisk på noget betyder, at man har lyst og overskud til det, og udtrykket hører hjemme i talesproget og i beskeder mellem venner. | 切出的片段独立复核未通过（recheck sim=0.92 edges=False） |
| U08-C010 | Venlig hilsen | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U08-C011 | Amina | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U08-C012 | Mailen til Thomas er venlig, men den kommer hurtigt til sagen. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U08-C022 | Med venlig hilsen | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U08-C023 | Amina Hassan | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U08-C024 | Henvendelsen til kommunen er mere formel, men ikke stiv. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U08-C038 | Nogle oplysninger skal man være særligt forsigtig med. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U08-C039 | Cpr-numre og helbredsoplysninger bør ikke sendes i en almindelig mail, men krypteret – for eksempel gennem den offentlige digitale postkasse eller en sikker mailløsning. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U08-C043 | En klage virker bedst, når den er saglig. | 切出的片段独立复核未通过（recheck sim=0.63 edges=False） |
| U09-C051 | »Højt til loftet« betyder i et stillingsopslag, at der er plads til forskellige meninger – ikke nødvendigvis, at kontoret har store rum. | 切出的片段独立复核未通过（recheck sim=0.94 edges=False） |
| U10-C007 | Far: Nej, det har ingen. Men du har vel også gået gratis i skole i tretten år? | 切出的片段独立复核未通过（recheck sim=0.93 edges=False） |
| U10-C027 | Som barn får man gratis skole, som ung SU og som gammel pension og pleje, og i årene midt imellem betaler man ind. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U10-C028 | Billedet viser, at de fleste både giver og får, men det halter på to punkter. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U11-C009 | Mads er 34 og har haft ondt i maven siden i går aftes. | 切出的片段独立复核未通过（recheck sim=0.83 edges=False） |
| U11-C015 | Lægen: Hvordan vil du beskrive den? Er den stikkende, jagende, murrende? | 切出的片段独立复核未通过（recheck sim=0.61 edges=False） |
| U11-C016 | Mads: Den er ligesom konstant, og den bliver værre, når jeg går eller hoster. | 切出的片段独立复核未通过（recheck sim=0.81 edges=False） |
| U11-C022 | Mads: Av! Ja, dér. | 片段过短，无法独立验证 |
| U11-C023 | Lægen: Det lyder ikke så godt. Det kan være blindtarmen, og det skal undersøges i dag. Jeg ringer til hospitalet. | 切出的片段独立复核未通过（recheck sim=0.96 edges=False） |
| U11-C054 | Patienten: Gør det ondt? | 切出的片段独立复核未通过（recheck sim=0.47 edges=False） |
| U12-C020 | Sara: Ja, og jeg skal hente min lillesøster klokken et. | 切出的片段独立复核未通过（recheck sim=0.87 edges=False） |
| U12-C043 | Hvor langt staten kan gå, før folk siger fra, er ikke altid til at forudsige. | 切出的片段独立复核未通过（recheck sim=0.88 edges=False） |
| U13-C011 | Efter 9. klasse vælger de unge enten en gymnasial uddannelse eller en erhvervsuddannelse, hvor man skiftevis går i skole og er i praktik i en virksomhed. | 切出的片段独立复核未通过（recheck sim=0.90 edges=False） |
| U13-C021 | Mads: Tak. | 片段过短，无法独立验证 |
| U14-C009 | Malik: Heller ikke efter halvtreds år? | 切出的片段独立复核未通过（recheck sim=0.76 edges=False） |
| U14-C010 | Mormor: Især ikke efter halvtreds år. | 切出的片段独立复核未通过（recheck sim=0.77 edges=False） |
| U14-C017 | Statsministeren kan dog udskrive valg tidligere, og det sker tit. | 切出的片段独立复核未通过（recheck sim=0.89 edges=False） |
| U14-C037 | Kandidaten: Mette Holm. Det står på folderen. | 切出的片段独立复核未通过（recheck sim=0.73 edges=True） |
| U15-C019 | Vidnet: Et par øl. | 切出的片段独立复核未通过（recheck sim=0.36 edges=False） |
| U15-C021 | Vidnet: Fem, måske seks. | 切出的片段独立复核未通过（recheck sim=0.59 edges=True） |
| U15-C025 | Kenneth har en mørk jakke, men det har halvdelen af de unge mænd i Aalborg en lørdag nat i februar. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U15-C026 | Retten frifinder ham. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U15-C027 | I dommen står der, at det ikke er bevist ud over enhver rimelig tvivl, at det var Kenneth, der slog. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U15-C053 | Kenneth gik fri. | 切出的片段独立复核未通过（recheck sim=0.54 edges=False） |
| U16-C014 | De digitale løsninger kan dog være svære at bruge, især for en del ældre og mennesker med handicap eller sprogvanskeligheder. | 切出的片段独立复核未通过（recheck sim=0.95 edges=False） |
| U16-C021 | Farmor: Nå. Og nu? | 片段过短，无法独立验证 |
| U16-C038 | Opkaldet: Hej, det er fra bankens sikkerhedsafdeling. Vi har registreret et mistænkeligt køb på dit kort. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U16-C039 | Lise: Nå? | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U16-C040 | Opkaldet: For at stoppe det skal du lige godkende en anmodning i din MitID-app. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U17-C005 | Hun ved ikke selv, hvornår hun gætter forkert, og hun lyder lige så sikker, når hun tager fejl, som når hun har ret. | 切出的片段独立复核未通过（recheck sim=0.96 edges=False） |
| U18-C017 | Oliver: Ikke mig. | 切出的片段独立复核未通过（recheck sim=0.62 edges=True） |
| U19-C003 | Barnebarnet: Nå, morfar? Hvad synes du? | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U19-C004 | Søren: Det ku' være værre. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U19-C005 | Barnebarnet: Kan du ikke lide det? | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U20-C013 | Men svenskerne følte sig ofte styret fra København, og i 1523 forlod Sverige unionen for altid. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U20-C014 | Fra da af var nabolandet mod øst ikke længere en del af det samme rige, men en rival. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U20-C024 | Kongen havde nu magten alene: Han gav lovene, udnævnte embedsmændene og var dommer i sidste instans. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U20-C025 | Søhelten Tordenskjold narrede ifølge en kendt historie fjenden ved at lade de samme få soldater marchere forbi igen og igen. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U21-C002 | Få årtier senere var det hele ved at falde fra hinanden. | 切出的片段独立复核未通过（recheck sim=0.85 edges=False） |
| U21-C007 | Fra slutningen af 1700-tallet blev stavnsbåndet ophævet, landsbyernes fælles marker blev delt op, og mange fæstebønder blev selvejere. | 切出的片段独立复核未通过（recheck sim=0.92 edges=False） |
| U21-C011 | Femten år senere førte Danmark krig mod Preussen og Østrig og led et knusende nederlag ved Dybbøl i april 1864. | 切出的片段独立复核未通过（recheck sim=0.87 edges=False） |
| U23-C003 | Mei: Kunne du tænke dig at tage med ud og spise i aften? | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U23-C004 | Anders: Hva'? | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U23-C005 | Mei: Undskyld … Jeg spurgte bare, om du ville med ud at spise. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U23-C020 | Dansk tales med mange forskellige dialekter, selvom forskellene er blevet mindre i løbet af det 20. århundrede. | 切出的片段独立复核未通过（recheck sim=0.93 edges=False） |
| U23-C036 | Rami: Mor … | 片段过短，无法独立验证 |
| U24-C026 | Der er en udbredt frygt for, at algoritmerne lukker folk inde i filterbobler, hvor de kun ser det, de i forvejen er enige i. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U24-C027 | Forskningen giver dog ikke ét enkelt svar: Filterbobler ser ud til at være mindre entydige end frygtet, mens algoritmer samtidig kan forstærke politisk polarisering. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U24-C033 | Hvem står bag? | 切出的片段独立复核未通过（recheck sim=0.64 edges=True） |
| U24-C034 | Hvordan ved de det? | 切出的片段独立复核未通过（recheck sim=0.45 edges=False） |
| U25-C022 | Sofie: Så virker det jo. | 切出的片段独立复核未通过（recheck sim=0.58 edges=False） |
| U28-C014 | Togføreren: Billetter, tak. | 切出的片段独立复核未通过（recheck sim=0.73 edges=True） |
| U28-C035 | Den sagkyndige: Godt. Find et sted at parkere langs kantstenen bag den hvide stationcar. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U28-C036 | Asta: Baglæns? | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U28-C037 | Den sagkyndige: Ja tak. | 句子边界未能经停顿 + ASR 双重确认（多为连续短对话） |
| U28-C056 | Turisten: Tak! | 片段过短，无法独立验证 |
| U29-C013 | Rådgivere anbefaler desuden, at man har en buffer til uforudsete udgifter, så en ødelagt vaskemaskine eller en tandlægeregning ikke skal betales med et dyrt lån. | 切出的片段独立复核未通过（recheck sim=0.91 edges=False） |
| U29-C021 | Butikker bruger den samme psykologi, når de placerer slik ved kassen, skriver »før« og en højere pris ved siden af tilbuddet eller tilbyder tre for to. | 切出的片段独立复核未通过（recheck sim=0.96 edges=False） |
| U29-C033 | Revisoren: Din omsætning er steget med 20 procent i forhold til sidste år. Tillykke. | 切出的片段独立复核未通过（recheck sim=0.85 edges=False） |
| U29-C034 | Louise: Tak. Men hvorfor føles det så ikke sådan? | 切出的片段独立复核未通过（recheck sim=0.89 edges=False） |
| U30-C048 | Sara: Fint. Og hvis karaktererne ikke bliver bedre, må jeg give dig ret. | 切出的片段独立复核未通过（recheck sim=0.95 edges=False） |
| U30-C049 | Ali: Og hvis de gør, så må jeg give dig ret. | 切出的片段独立复核未通过（recheck sim=0.92 edges=False） |
