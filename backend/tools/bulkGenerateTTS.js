#!/usr/bin/env node
/**
 * Genera audios ElevenLabs para todos los textos de un tenant concreto.
 *
 * Uso:
 *   node backend/tools/bulkGenerateTTS.js [--tenant parque_europa] [--lang es] [--mode normal] [--pause|--no-pause]
 *
 * Requiere el script generateElevenLabsTTS.js en la misma carpeta.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const args = process.argv.slice(2);

function printHelpAndExit() {
  console.log('Uso: node backend/tools/bulkGenerateTTS.js [opciones]');
  console.log('  --tenant <id>   Tenant objetivo (default: parque_europa)');
  console.log('  --lang <codigo> Idioma dentro de texts/audio (default: es)');
  console.log('  --mode <modo>   Variante de texto/audio (default: normal)');
  console.log('  --pause         Pausa tras cada audio (default)');
  console.log('  --no-pause      Sin pausas entre audios');
  console.log('  --help          Muestra esta ayuda');
  process.exit(0);
}

if (args.includes('--help')) {
  printHelpAndExit();
}

function getOptionValue(flag, fallback) {
  const idx = args.indexOf(flag);
  if (idx === -1) return fallback;
  const value = args[idx + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Falta valor para ${flag}`);
    process.exit(1);
  }
  return value;
}

const tenantId = getOptionValue('--tenant', 'parque_europa');
const language = getOptionValue('--lang', 'es');
const mode = getOptionValue('--mode', 'normal');

let pauseAfterEach = true;
if (args.includes('--no-pause')) pauseAfterEach = false;
if (args.includes('--pause')) pauseAfterEach = true;

const tenantRoot = path.resolve(__dirname, '../tenants', tenantId);
const TEXT_ROOT = path.join(tenantRoot, 'texts', language);
const AUDIO_ROOT = path.join(tenantRoot, 'audio', language);
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
    console.error('No se encontro la carpeta de textos:', TEXT_ROOT);
    process.exit(1);
  }

  if (!fs.existsSync(TTS_SCRIPT)) {
    console.error('No se encontro generateElevenLabsTTS.js');
    process.exit(1);
  }

  if (!fs.existsSync(AUDIO_ROOT)) {
    fs.mkdirSync(AUDIO_ROOT, { recursive: true });
  }

  console.log(`Generando audios para tenant "${tenantId}" (${language}/${mode})`);

  const monuments = fs
    .readdirSync(TEXT_ROOT, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort();

  let generated = 0;
  for (const monument of monuments) {
    const sourceTxt = path.join(TEXT_ROOT, monument, `${mode}.txt`);
    if (!fs.existsSync(sourceTxt)) {
      console.warn(`Sin texto ${mode}: ${monument}`);
      continue;
    }

    const monumentAudioDir = path.join(AUDIO_ROOT, monument);
    if (!fs.existsSync(monumentAudioDir)) {
      fs.mkdirSync(monumentAudioDir, { recursive: true });
    }

    const outputFile = path.join(monumentAudioDir, `${mode}.mp3`);
    if (fs.existsSync(outputFile)) {
      console.log(`(saltado) Ya existe ${outputFile}`);
      continue;
    }

    console.log(`-> ${monument}: ${sourceTxt} -> ${outputFile}`);

    const result = spawnSync('node', [TTS_SCRIPT, '--file', sourceTxt, outputFile], {
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      console.error(`Fallo la generacion para ${monument} (codigo ${result.status})`);
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
