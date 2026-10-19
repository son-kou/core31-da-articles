// npm run validate:teacher — every teaching JSON that exists must validate fully; missing parts are fine.
import { TEACHER, UNITS } from './paths';
import { loadCommittedRegistry } from './registry';
import { scanTeacherDir } from './teacher-files';

const reg = loadCommittedRegistry();
const reports = scanTeacherDir(TEACHER, reg);
let bad = 0;
for (const r of reports) {
  if (r.errors.length) {
    bad++;
    console.error(`\n✗ src/data/teacher/${r.file}`);
    for (const e of r.errors) console.error(`    - ${e}`);
  } else {
    console.log(`✓ src/data/teacher/${r.file}  (${r.ids.length} 句)`);
  }
  for (const w of r.warnings) console.warn(`    ! ${w}`);
}
const covered = new Set(reports.flatMap((r) => (r.errors.length ? [] : r.ids)));
const total = UNITS.reduce((n, u) => n + reg[u].all.ids.length, 0);
const fullUnits = UNITS.filter((u) => reg[u].all.ids.every((id) => covered.has(id))).length;
console.log(`\n教学覆盖：${covered.size} / ${total} 句；完整单元 ${fullUnits} / 31；文件 ${reports.length} 个，错误 ${bad} 个。`);
if (bad) {
  console.error(`\n校验失败：请修正上面标 ✗ 的文件（或暂时移出 src/data/teacher/）。网站不会构建含错误的教学内容。`);
  process.exit(1);
}
