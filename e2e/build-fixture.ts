// Build dist-e2e/ with one temporary teaching file (U30/P01) to exercise the drop-in path, then remove the file again.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FIXTURE, fixtureJson, SITE } from './fixture';

if (fs.existsSync(FIXTURE)) throw new Error(`${FIXTURE} already exists — e2e will not overwrite real teaching content; move it aside first.`);
fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
fs.writeFileSync(FIXTURE, JSON.stringify(fixtureJson(), null, 2));
try {
  // no code change, just the file: validation passes and the build picks it up
  execSync('npx tsx scripts/validate-teacher.ts', { cwd: SITE, stdio: 'pipe' });
  execSync('npx vite build --outDir dist-e2e --emptyOutDir --logLevel warn', { cwd: SITE, stdio: 'inherit' });
} finally {
  fs.rmSync(FIXTURE);
  try {
    fs.rmdirSync(path.dirname(FIXTURE));
  } catch {
    /* folder not empty */
  }
}
