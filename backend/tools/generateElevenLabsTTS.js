#!/usr/bin/env node
/**
 * Simple helper to synthesize speech in Spanish using ElevenLabs.
 *
 * Usage:
 *   node backend/tools/generateElevenLabsTTS.js "Hola mundo" salida.mp3
 *   # or with a text file
 *   node backend/tools/generateElevenLabsTTS.js --file texto.txt salida.mp3
 *
 * Env vars:
 *   ELEVENLABS_API_KEY (optional, defaults to the provided project key)
 *   ELEVENLABS_VOICE_ID (optional, defaults to fRDnLmEYnsOOldlrmhg5)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DEFAULT_API_KEY = 'sk_8d48757b3ee0c409ac55090895b9a277a8632ef216c2e121';
const DEFAULT_VOICE_ID = 'fRDnLmEYnsOOldlrmhg5';
const MODEL_ID = 'eleven_v3';
const API_HOST = 'api.elevenlabs.io';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Uso: node backend/tools/generateElevenLabsTTS.js [--file texto.txt | "Texto literal"] salida.mp3');
  process.exit(1);
}

let inputText = '';
let outputPath = '';

if (args[0] === '--file') {
  if (!args[1] || !args[2]) {
    console.error('Error: necesitas indicar un archivo de texto y el mp3 de destino.');
    process.exit(1);
  }
  const filePath = args[1];
  outputPath = args[2];
  if (!fs.existsSync(filePath)) {
    console.error(`No se encontró el archivo ${filePath}`);
    process.exit(1);
  }
  inputText = fs.readFileSync(filePath, 'utf8').trim();
} else {
  inputText = args[0];
  outputPath = args[1];
}

if (!inputText) {
  console.error('Error: el texto está vacío.');
  process.exit(1);
}

const apiKey = process.env.ELEVENLABS_API_KEY || DEFAULT_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

const payload = JSON.stringify({
  text: inputText,
  model_id: MODEL_ID,
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.65,
    use_speaker_boost: true,
  },
});

const options = {
  hostname: API_HOST,
  path: `/v1/text-to-speech/${voiceId}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'xi-api-key': apiKey,
    'Accept': 'audio/mpeg',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log(`Generando audio (${inputText.length} caracteres) → ${outputPath}`);

const req = https.request(options, (res) => {
  if (res.statusCode !== 200) {
    let errorBody = '';
    res.on('data', (chunk) => errorBody += chunk.toString());
    res.on('end', () => {
      console.error(`Error ${res.statusCode}: ${errorBody}`);
      process.exit(1);
    });
    return;
  }

  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const absPath = path.resolve(outputPath);
    fs.writeFileSync(absPath, buffer);
    console.log(`Audio guardado en ${absPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  });
});

req.on('error', (err) => {
  console.error('Error al conectar con ElevenLabs:', err.message);
  process.exit(1);
});

req.write(payload);
req.end();
