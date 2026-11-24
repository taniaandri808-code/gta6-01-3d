// main.ts - gta6-01 dossier entrypoint
import { buildDossier } from './vendor/makefun-game.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(__dirname, 'game'), path.join(out, 'game'), { recursive: true });
fs.cpSync(path.join(__dirname, 'screenshots'), path.join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000
});

fs.writeFileSync(path.join(out, 'dossier.json'), JSON.stringify(dossier, null, 2));
