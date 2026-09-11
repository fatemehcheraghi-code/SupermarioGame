#!/usr/bin/env node
/*
 * Generates the game's title screen background theme with the ElevenLabs Music API
 * and writes it into assets/audio/music/. Skips generation if the file already exists
 * unless FORCE_REGENERATE is set, so re-runs on every push don't keep spending credits.
 *
 * Requires ELEVENLABS_API_KEY in the environment (mapped from the ELEVENLAB repo secret in CI).
 */
import { writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'assets', 'audio', 'music');
const API_URL = 'https://api.elevenlabs.io/v1/music';
const FORCE = process.env.FORCE_REGENERATE === 'true';

const TRACKS = {
  'title-theme': {
    prompt: 'Upbeat retro 8-bit chiptune overworld theme for a platform video game title screen, cheerful and adventurous, looping instrumental, no vocals',
    music_length_ms: 20000,
  },
};

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function generate(name, { prompt, music_length_ms }) {
  const outPath = path.join(OUT_DIR, `${name}.mp3`);
  if (!FORCE && await exists(outPath)) {
    console.log(`skip  ${name} (already exists)`);
    return;
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      prompt,
      music_length_ms,
      force_instrumental: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs music request failed for "${name}": ${res.status} ${res.statusText} ${body}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  console.log(`wrote ${name} (${buf.length} bytes)`);
}

async function main() {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ELEVENLABS_API_KEY is not set. Aborting.');
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  for (const [name, spec] of Object.entries(TRACKS)) {
    await generate(name, spec);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
