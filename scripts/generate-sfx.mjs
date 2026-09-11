#!/usr/bin/env node
/*
 * Generates the game's retro sound effects with the ElevenLabs Text-to-Sound-Effects API
 * and writes them into assets/audio/sfx/. Existing files are skipped unless FORCE_REGENERATE
 * is set, so re-runs on every push don't keep spending ElevenLabs credits.
 *
 * Requires ELEVENLABS_API_KEY in the environment (mapped from the ELEVENLAB repo secret in CI).
 */
import { writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'assets', 'audio', 'sfx');
const API_URL = 'https://api.elevenlabs.io/v1/sound-generation';
const FORCE = process.env.FORCE_REGENERATE === 'true';

const SFX = {
  jump:    { text: 'Short retro 8-bit video game jump sound effect, quick upward pitch blip, cheerful chiptune synth chirp', duration_seconds: 0.5 },
  bigjump: { text: 'Retro 8-bit video game big jump sound effect, deeper upward pitch sweep, energetic chiptune synth', duration_seconds: 0.6 },
  coin:    { text: 'Retro 8-bit video game coin pickup sound effect, two-note bright chime, cheerful chiptune synth blip', duration_seconds: 0.5 },
  stomp:   { text: 'Retro 8-bit video game enemy stomp squash sound effect, short muffled thump with a soft noise burst', duration_seconds: 0.5 },
  kick:    { text: 'Retro 8-bit video game kick sound effect, low thud with a quick downward pitch drop', duration_seconds: 0.5 },
  bump:    { text: 'Retro 8-bit video game block bump sound effect, short low chiptune synth blip', duration_seconds: 0.5 },
  brk:     { text: 'Retro 8-bit video game brick breaking sound effect, crunchy noise burst as it shatters', duration_seconds: 0.5 },
  powerup: { text: 'Retro 8-bit video game power-up sound effect, ascending four-note bright chiptune arpeggio, triumphant', duration_seconds: 0.8 },
  fireball:{ text: 'Retro 8-bit video game fireball shoot sound effect, short descending synth zap', duration_seconds: 0.5 },
  hurt:    { text: 'Retro 8-bit video game player hurt sound effect, descending harsh synth buzz', duration_seconds: 0.5 },
  death:   { text: 'Retro 8-bit video game character death sound effect, descending sad chiptune melody, five notes falling', duration_seconds: 1.0 },
  flag:    { text: 'Retro 8-bit video game level complete flagpole sound effect, ascending cheerful chiptune scale, six notes rising', duration_seconds: 0.7 },
  star:    { text: 'Retro 8-bit video game sparkle star pickup sound effect, short high bright chiptune twinkle', duration_seconds: 0.5 },
  pause:   { text: 'Retro 8-bit video game pause menu sound effect, short soft synth blip rising in pitch', duration_seconds: 0.5 },
};

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function generate(name, { text, duration_seconds }) {
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
      text,
      duration_seconds,
      prompt_influence: 0.4,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs request failed for "${name}": ${res.status} ${res.statusText} ${body}`);
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

  for (const [name, spec] of Object.entries(SFX)) {
    await generate(name, spec);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
