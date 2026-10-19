# Danish CORE · Deep Teacher

31 篇冻结 V3 CORE 丹麦语文章的静态学习网站：逐句精讲（Deep Teacher）、全文朗读、单句播放，以及精读 / 听力 / 跟读 / 背诵四种模式。
纯静态（Vite + TypeScript），没有后端、数据库、账号、统计或任何付费 API。讲解内容由你用 ChatGPT（GPT-6）生成 JSON 后放进仓库，推送即自动上线。

线上地址（启用 GitHub Pages 后）：`https://son-kou.github.io/core31-da-articles/`

---

## 1. 本地运行

需要 Node.js ≥ 18.17（浏览器自动化测试需要 Node 20+）。

```bash
cd danish-core-deep-teacher
npm install          # 只需第一次
npm run dev          # 打开 http://localhost:5173/
```

生产构建与预览：

```bash
npm run build        # 先跑全部校验，再构建到 dist/
npm run preview      # 打开 http://localhost:4173/
```

## 2. 打开 31 篇文章

首页按主题分成 5 组（也可切换为 U00–U30 原始顺序），支持搜索标题、副标题、主题标签和章节名。
每张卡片显示单元号、标题、副标题、主题、句数、章数、全文时长、讲解完成度和你本机的学习进度。

链接可以直接收藏或刷新：

| 链接 | 含义 |
|---|---|
| `#/U00` | U00，使用上次的模式 |
| `#/U00/read` · `#/U00/listen` · `#/U00/shadow` · `#/U00/recall` | 精读 · 听力 · 跟读 · 背诵 |
| `#/U00/shadow/U00-C039` | 直接跳到某一句 |

四种模式：

- **精读（Deep Teacher）**：每句一张卡片。中文可整体隐藏（逐句点开），“精讲”默认收起，先自己理解再展开。每句有播放和单句循环按钮。
- **听力**：默认隐藏原文，先听全文；可从任一章开始播放，再显示原文对照。只有时间点经过验证的句子才会高亮、可点击跳转。
- **跟读**：一次一句，大字号；播放 / 上一句 / 下一句 / 单句循环 / 语速 / 自动下一句（可设停顿时间供你跟读）。键盘：空格、←、→、L、Z。
- **背诵**：以中文（讲解完成后）或“章节 + 词数”为提示，原句以词形遮罩隐藏；显示原文核对，标记“熟悉 / 练习中 / 已掌握”，可按标记筛选。

全文播放器在页面底部：播放 / 暂停、回到开头、拖动进度、语速 0.6–1.4×、“跟随”开关。全文和单句音频不会同时播放。

## 3. 用 GPT 生成讲解：完整流程

### 3.1 复制 prompt

- **推荐：分批 prompt** `prompts/parts/Uxx_Pyy_PROMPT.txt` —— 共 117 个，每批 12–18 句，尽量按章节和段落切分。
- 整篇 prompt `prompts/Uxx_PROMPT.txt`（31 个）是总览和便捷入口；单元都在 29 句以上，整篇回答很容易被截断，一般不要用。
- 总表：`prompts/INDEX.md`（每个单元有几批、保存到哪里）。

每个 prompt 都是自包含的：教学要求、输出 JSON 格式、本批的 unit / part / 指纹、全文上下文（▶ 标出本批句子）和本批句子列表。
打开文件 → 全选复制 → 在 ChatGPT 里**新开一个对话**粘贴发送。

### 3.2 保存 GPT 的回答

把回答保存为：

```
prompts/parts/U00_P02_PROMPT.txt  →  src/data/teacher/U00/P02.json
prompts/U00_PROMPT.txt            →  src/data/teacher/U00/ALL.json
```

文件夹 `U00`…`U30` 不存在就新建。**不需要改任何代码、导入、路由或 HTML**：构建时自动发现所有 `src/data/teacher/Uxx/Pyy.json`。

更省事的办法：把 GPT 的回答原样（带 \`\`\`json 也可以）粘贴到 `inbox/` 下任意文件（如 `inbox/1.txt`），然后：

```bash
npm run ingest       # 去掉代码块标记和多余文字 → 校验 → 写到 src/data/teacher/Uxx/Pyy.json
```

### 3.3 校验

```bash
npm run validate:teacher
```

检查：JSON 语法、schema_version、unit 与文件夹一致、part 与文件名一致、指纹、句子 ID 完全正确（不多、不少、不重复、不属于别的批次）、字段类型、不含 HTML/脚本、不含“TODO / 无 / 略”等占位文字、不含丹麦语原句字段。
部分完成没问题：一个单元可以只有 P01、P03。但**存在的每个文件都必须完全通过**。错误信息是中文的，会指出文件、句子 ID 和字段。

### 3.4 推送与自动部署

```bash
git add src/data/teacher
git commit -m "U00 P02 讲解"
git push
```

GitHub Actions（`.github/workflows/pages.yml`）会依次：安装依赖 → CORE 完整性校验 → 音频映射校验 → 教学 JSON 校验 → 测试 → 构建 → 部署到 GitHub Pages。几分钟后网站上对应的句子就会出现讲解。
任何一步失败都不会部署（线上保持上一个版本），在仓库的 Actions 页面可以看到中文错误信息。

**第一次启用 Pages**：仓库 Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。

### 3.5 GPT 回复出问题怎么办

| 现象 | 处理 |
|---|---|
| 回复中途断了（JSON 不以 `}` 结尾，校验提示“缺少 N 句……很可能被截断”） | 最稳妥：在新对话里**重新发送同一个分批 prompt**。“继续”出来的半截 JSON 很难正确拼接。 |
| 前后有说明文字或 \`\`\`json | 用 `npm run ingest`，或手工删掉 JSON 以外的内容。 |
| 中文引号 “ ” 用作 JSON 引号、多余逗号 | 校验会指出行号和可能原因；手工改正或重新生成。 |
| 指纹不对 / unit、part 不对 | 说明回答对应了别的 prompt，或 GPT 改了指纹。确认文件名后，把正确值从 prompt 第五节复制过去，或重新生成。 |
| 多出 `da` / `text` 字段（GPT 抄了原句） | 删除这些字段：原句只来自冻结 CORE。 |
| 字段写了“无”“略” | 改成 `""` 或 `[]`。 |
| 想重做某一批 | 直接用新回答覆盖 `Pyy.json`。 |

不想处理的文件可以先移出 `src/data/teacher/`，其他批次照常上线。

## 4. 本地学习进度

保存在浏览器的 localStorage（键 `dcdt:v1`，带版本号，升级不会清空）：当前单元、最后阅读 / 练习的句子、句子标记、首选模式、语速、主题、中文显示、听力模式是否隐藏原文、跟读设置。

- **只在当前浏览器、当前设备有效**，不上传，不在手机和电脑之间同步；清除网站数据会丢失。
- 单元页底部“重置本单元的学习进度”；首页底部可清除全部。
- 这不是间隔重复算法；词汇 SRS 继续用 Anki。

## 5. 音频

- **全文音频 31/31**：原有 `V3_CORE_AUDIO/Uxx_CORE.mp3`（Azure da-DK-JeppeNeural），逐字节复制到 `public/audio/full/`，没有重新合成。
- **单句音频**：见 `reports/AUDIO_COVERAGE.md`（每个单元的覆盖率和所有缺失句子及原因）。只有经过“停顿 + ASR 边界”对齐**并且**切出后独立复核通过的句子才有播放按钮；其余句子按钮置灰，绝不播放相邻片段。
- 听力模式的高亮只用这些已验证的区间。

单句音频由本机脚本离线生成（需要 ffmpeg 和 faster-whisper，无网络、无 TTS），CI 不会运行它：

```bash
python3 scripts/audio/build_audio.py      # 读取 V3_CORE_AUDIO 与已有对齐结果（只读），写 public/audio + src/data/audio
npx tsx scripts/audio-report.ts           # 生成 reports/AUDIO_COVERAGE.md
```

## 6. 冻结原文的保护

- 丹麦语原文**只**存在于 `src/data/core/Uxx.json`，由 `npm run extract:core` 从冻结的 `V3_CORPUS_WRITING/DANISH_C1_CORPUS_V3/CORE/` 提取；提取时要求 JSON 能逐字节还原原文件，且 SHA-256 等于 `CORE_FROZEN.sha256`。
- `npm run validate:core`（CI 每次都跑）再次由 JSON 还原 31 个原文件并核对 SHA-256；任何改动都会让构建失败。
- 教学 JSON 只按句子 ID 引用原文，不能携带或替换丹麦语句子。

## 7. 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发服务器 |
| `npm run validate` | CORE + 音频 + 教学 JSON 全部校验 |
| `npm run validate:teacher` | 只校验教学 JSON |
| `npm run ingest` | 处理 `inbox/` 里的 GPT 回答 |
| `npm test` | 单元测试（语料、prompt、JSON 校验、音频映射、安全渲染） |
| `npm run test:e2e` | 浏览器测试（Playwright，桌面 + 390 px；需 Node 20+） |
| `npm run build` | 校验 + 类型检查 + 构建 |
| `npm run prompts` | 重新生成 prompt 和分批表（只有 CORE 勘误后才需要） |
| `npm run extract:core` | 重新从冻结原文提取（只有经你批准的勘误后才需要） |

## 8. 目录

```
src/data/core/        冻结原文（JSON）+ frozen.sha256 + index.json
src/data/teacher/     GPT 讲解：Uxx/Pyy.json（你添加）
src/data/audio/       每单元音频清单（经验证的单句区间）
src/data/parts.json   分批计划与指纹（自动生成）
public/audio/full/    31 个全文 MP3
public/audio/sentences/  经验证的单句 MP3
prompts/              31 个整篇 prompt、prompts/parts/ 117 个分批 prompt、INDEX.md
scripts/              提取、校验、prompt 生成、ingest、音频脚本
reports/              音频覆盖报告、状态报告
```

## 9. 发布前须知

- GitHub Pages 的免费方案要求**公开仓库**：文章原文、讲解和音频都会公开可见。仓库里只有这 31 篇 CORE 和相关音频，没有 Anki 数据、密钥或其他项目文件。
- 网站设置了 `noindex`，不会主动被搜索引擎收录，但链接本身是公开的。
- 体积：全文音频约 93 MB + 单句音频约 50 MB，远低于 GitHub Pages 1 GB 的限制，单个文件都很小。
