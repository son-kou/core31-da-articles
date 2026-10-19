# GPT 教学 prompt 索引

自动生成（`npm run prompts`），请勿手改。共 31 个整篇 prompt、117 个分批 prompt。

**推荐做法：使用分批 prompt** `prompts/parts/Uxx_Pyy_PROMPT.txt`（每批 12–18 句）。
整篇 prompt `prompts/Uxx_PROMPT.txt` 是总览和便捷入口：只有很短的单元才建议一次生成整篇，长单元的整篇回答很容易被截断。

| 单元 | 标题 | 句数 | 分批数 (每批句数) | 建议 | 保存位置 |
|---|---|---|---|---|---|
| U00 | Tillid – det usynlige fundament | 72 | 5 (16 + 12 + 13 + 14 + 17) | 用分批 prompt | `src/data/teacher/U00/P01.json` … `P05.json` |
| U01 | Familieliv og hverdagens logistik | 91 | 6 (17 + 18 + 16 + 13 + 13 + 14) | 用分批 prompt | `src/data/teacher/U01/P01.json` … `P06.json` |
| U02 | Mad og måltider | 83 | 6 (14 + 15 + 12 + 13 + 14 + 15) | 用分批 prompt | `src/data/teacher/U02/P01.json` … `P06.json` |
| U03 | Hjemmet | 76 | 5 (14 + 17 + 15 + 15 + 15) | 用分批 prompt | `src/data/teacher/U03/P01.json` … `P05.json` |
| U04 | Følelser og relationer | 91 | 6 (18 + 14 + 15 + 15 + 14 + 15) | 用分批 prompt | `src/data/teacher/U04/P01.json` … `P06.json` |
| U05 | Fritid og fællesskab | 47 | 3 (16 + 15 + 16) | 用分批 prompt | `src/data/teacher/U05/P01.json` … `P03.json` |
| U06 | Samarbejde på arbejdspladsen | 60 | 4 (17 + 17 + 14 + 12) | 用分批 prompt | `src/data/teacher/U06/P01.json` … `P04.json` |
| U07 | Arbejdsmarkedet | 36 | 3 (12 + 12 + 12) | 用分批 prompt | `src/data/teacher/U07/P01.json` … `P03.json` |
| U08 | Skriftlig kommunikation | 74 | 5 (15 + 13 + 14 + 16 + 16) | 用分批 prompt | `src/data/teacher/U08/P01.json` … `P05.json` |
| U09 | Job og karriere | 58 | 4 (13 + 13 + 18 + 14) | 用分批 prompt | `src/data/teacher/U09/P01.json` … `P04.json` |
| U10 | Velfærdsstaten | 40 | 3 (13 + 12 + 15) | 用分批 prompt | `src/data/teacher/U10/P01.json` … `P03.json` |
| U11 | Kroppen, sygdom og behandling | 76 | 5 (14 + 14 + 16 + 17 + 15) | 用分批 prompt | `src/data/teacher/U11/P01.json` … `P05.json` |
| U12 | Sundhed, livsstil og risiko | 43 | 3 (13 + 14 + 16) | 用分批 prompt | `src/data/teacher/U12/P01.json` … `P03.json` |
| U13 | Uddannelse og læring | 51 | 3 (15 + 18 + 18) | 用分批 prompt | `src/data/teacher/U13/P01.json` … `P03.json` |
| U14 | Demokratiet | 44 | 3 (12 + 15 + 17) | 用分批 prompt | `src/data/teacher/U14/P01.json` … `P03.json` |
| U15 | Retssamfundet | 55 | 4 (13 + 14 + 16 + 12) | 用分批 prompt | `src/data/teacher/U15/P01.json` … `P04.json` |
| U16 | Det digitale Danmark | 55 | 4 (15 + 14 + 14 + 12) | 用分批 prompt | `src/data/teacher/U16/P01.json` … `P04.json` |
| U17 | Kunstig intelligens | 44 | 3 (14 + 17 + 13) | 用分批 prompt | `src/data/teacher/U17/P01.json` … `P03.json` |
| U18 | Traditioner, højtider og hygge | 48 | 3 (15 + 18 + 15) | 用分批 prompt | `src/data/teacher/U18/P01.json` … `P03.json` |
| U19 | Værdier og tro | 48 | 3 (15 + 17 + 16) | 用分批 prompt | `src/data/teacher/U19/P01.json` … `P03.json` |
| U20 | Danmarkshistorien I | 29 | 2 (14 + 15) | 用分批 prompt | `src/data/teacher/U20/P01.json` … `P02.json` |
| U21 | Danmarkshistorien II | 30 | 2 (14 + 16) | 用分批 prompt | `src/data/teacher/U21/P01.json` … `P02.json` |
| U22 | Danmark i verden | 41 | 3 (14 + 13 + 14) | 用分批 prompt | `src/data/teacher/U22/P01.json` … `P03.json` |
| U23 | Sprog og identitet | 50 | 3 (16 + 16 + 18) | 用分批 prompt | `src/data/teacher/U23/P01.json` … `P03.json` |
| U24 | Medier, nyheder og kildekritik | 62 | 4 (15 + 16 + 14 + 17) | 用分批 prompt | `src/data/teacher/U24/P01.json` … `P04.json` |
| U25 | Kunst og kultur | 38 | 3 (14 + 12 + 12) | 用分批 prompt | `src/data/teacher/U25/P01.json` … `P03.json` |
| U26 | Natur og landskab | 48 | 3 (15 + 15 + 18) | 用分批 prompt | `src/data/teacher/U26/P01.json` … `P03.json` |
| U27 | Klima og energi | 45 | 3 (12 + 17 + 16) | 用分批 prompt | `src/data/teacher/U27/P01.json` … `P03.json` |
| U28 | Transport, byer og rejser | 69 | 5 (13 + 14 + 13 + 17 + 12) | 用分批 prompt | `src/data/teacher/U28/P01.json` … `P05.json` |
| U29 | Økonomi | 64 | 4 (13 + 18 + 16 + 17) | 用分批 prompt | `src/data/teacher/U29/P01.json` … `P04.json` |
| U30 | Viden og argumentation | 57 | 4 (14 + 14 + 14 + 15) | 用分批 prompt | `src/data/teacher/U30/P01.json` … `P04.json` |

- 分批 prompt 的回答保存为 `src/data/teacher/Uxx/Pyy.json`（例如 `U00_P02_PROMPT.txt` → `src/data/teacher/U00/P02.json`）。
- 整篇 prompt 的回答保存为 `src/data/teacher/Uxx/ALL.json`。同一单元不要同时保留 ALL.json 和 Pxx.json（校验会报“重复覆盖”）。
- 每个 prompt 都自带全文上下文、句子 ID、指纹和输出格式，可以单独粘贴到新的 ChatGPT 对话中使用。
