# 教学 JSON 放这里

- 分批 prompt `prompts/parts/U00_P02_PROMPT.txt` 的回答 → `src/data/teacher/U00/P02.json`
- 整篇 prompt `prompts/U00_PROMPT.txt` 的回答 → `src/data/teacher/U00/ALL.json`（同一单元不要同时保留 ALL.json 和 Pxx.json）
- 文件夹 `U00` … `U30` 不存在时直接新建。
- 不需要改任何代码：网站在构建时自动发现这里的所有 `Uxx/Pyy.json`。
- 提交前运行 `npm run validate:teacher`；有错误的文件会让构建失败，不会被渲染。

或者：把 GPT 的回答原样（含 \`\`\`json 也行）保存到 `inbox/` 里的任意 .txt/.json 文件，运行 `npm run ingest`，它会校验并放到正确位置。
