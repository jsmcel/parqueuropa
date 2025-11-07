#!/usr/bin/env node
/**
 * Genera audios ElevenLabs para todos los textos "normal" en espanol del Parque Europa.
 * Los MP3 se guardan en: backend/tenants/parque_europa/audio/es/<monumento>/normal.mp3
 *
 * Flags:
 *   --pause     (por defecto) pausa tras cada audio.
 *   --no-pause  ejecuta todo sin detenerse.
 *
 * Requiere el script generateElevenLabsTTS.js en la misma carpeta.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Uso: node backend/tools/bulkGenerateTTS.js [--pause | --no-pause]');
  console.log('  --pause     Fuerza pausa tras cada audio (comportamiento por defecto).');
  console.log('  --no-pause  Genera todos los audios sin detenerse.');
  process.exit(0);
}
let pauseAfterEach = true;
if (args.includes('--no-pause')) pauseAfterEach = false;
if (args.includes('--pause')) pauseAfterEach = true;

const TEXT_ROOT = path.resolve(__dirname, '../tenants/parque_europa/texts/es');
const AUDIO_ROOT = path.resolve(__dirname, '../tenants/parque_europa/audio/es');
const TTS_SCRIPT = path.resolve(__dirname, './generateElevenLabsTTS.js');

function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Pulsa Enter para continuar con el siguiente audio...', () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  if (!fs.existsSync(TEXT_ROOT)) {
    console.error('No se encontró la carpeta de textos:', TEXT_ROOT);
    process.exit(1);
  }

  if (!fs.existsSync(TTS_SCRIPT)) {
    console.error('No se encontró generateElevenLabsTTS.js');
    process.exit(1);
  }

  if (!fs.existsSync(AUDIO_ROOT)) {
    fs.mkdirSync(AUDIO_ROOT, { recursive: true });
  }

  const monuments = fs.readdirSync(TEXT_ROOT, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort();

  let generated = 0;
  for (const monument of monuments) {
    const normalTxt = path.join(TEXT_ROOT, monument, 'normal.txt');
    if (!fs.existsSync(normalTxt)) {
      console.warn(`Sin texto normal: ${monument}`);
      continue;
    }

    const monumentAudioDir = path.join(AUDIO_ROOT, monument);
    if (!fs.existsSync(monumentAudioDir)) {
      fs.mkdirSync(monumentAudioDir, { recursive: true });
    }
    const outputFile = path.join(monumentAudioDir, 'normal.mp3');
    if (fs.existsSync(outputFile)) {
      console.log(`(saltado) Ya existe ${outputFile}`);
      continue;
    }

    console.log(`→ ${monument}: ${normalTxt} -> ${outputFile}`);

    const result = spawnSync('node', [TTS_SCRIPT, '--file', normalTxt, outputFile], {
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      console.error(`Falló la generación para ${monument} (código ${result.status})`);
      process.exit(result.status);
    }
    generated += 1;
    if (pauseAfterEach) {
      await waitForEnter();
    }
  }

  console.log(`Audios generados correctamente: ${generated}`);
}

main().catch((err) => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
