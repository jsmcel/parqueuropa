#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { mkdir, readFile, writeFile } = require('fs/promises');
const sharp = require('sharp');

const API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const DEFAULT_TENANT_ID = process.env.TENANT_ID || 'parque_europa';

function resolveTenantPaths(tenantId) {
  const mediaDir = path.join('backend', 'tenants', tenantId, 'media');
  return {
    manifest: path.join(mediaDir, 'slider.manifest.json'),
    monumentsDir: path.join(mediaDir, 'monuments'),
    attributions: path.join(mediaDir, 'ATTRIBUTIONS.json'),
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.replace(/^--/, '');
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  const tenantId = args.tenant || args.t || DEFAULT_TENANT_ID;
  const tenantPaths = resolveTenantPaths(tenantId);
  return {
    tenantId,
    manifest: args.manifest || args.m || tenantPaths.manifest,
    outputDir: args.output || args.o || tenantPaths.monumentsDir,
    attribFile: args.attrib || args.a || tenantPaths.attributions,
    includeRisky: Boolean(args['include-risky'] || args.includeRisky),
    dryRun: Boolean(args['dry-run'] || args.dryRun),
  };
}

function stripHtml(value) {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
}

async function ensureDir(targetPath) {
  await mkdir(targetPath, { recursive: true });
}

async function generateOptimizedVariant(buffer, targetPath) {
  const optimized = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();

  await ensureDir(path.dirname(targetPath));
  await writeFile(targetPath, optimized);

  return optimized.length;
}

async function loadJsonIfExists(filePath, fallback) {
  try {
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function fetchFileMetadata(fileTitle) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    titles: fileTitle,
    iiprop: 'url|dimensions|extmetadata|size|timestamp',
    iiurlwidth: '2048',
    origin: '*',
  });
  const response = await fetch(`${API_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Wikimedia API request failed (${response.status}) for ${fileTitle}`);
  }
  const payload = await response.json();
  const pages = payload?.query?.pages || {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url) {
    throw new Error(`No image info found for ${fileTitle}`);
  }
  return { page, info };
}

function normalizeFileName(fileTitle) {
  return fileTitle
    .replace(/^File:/i, '')
    .replace(/[^a-z0-9_.-]+/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

function buildOptimizedFilename(filename) {
  const ext = path.extname(filename) || '.jpg';
  const base = ext.length > 0 ? filename.slice(0, -ext.length) : filename;
  return `${base}_web${ext}`;
}

async function downloadBinary(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function writeAttributions(filePath, data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(filePath, serialized, 'utf8');
}

function formatJsValue(value) {
  if (value === undefined) {
    return 'null';
  }
  return JSON.stringify(value ?? null);
}

(async () => {
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(process.cwd(), options.manifest);
  const outputDir = path.resolve(process.cwd(), options.outputDir);
  const attribPath = path.resolve(process.cwd(), options.attribFile);

  const manifest = await loadJsonIfExists(manifestPath, {});
  const monuments = Array.isArray(manifest.monuments) ? manifest.monuments : [];
  if (!monuments.length) {
    console.warn('No monuments found in manifest.');
    return;
  }

  const attributions = await loadJsonIfExists(attribPath, {});
  let totalDownloads = 0;

  for (const monument of monuments) {
    const { slug, title, wikimedia_files: files = [], license_note: licenseNote } = monument;
    if (!slug) {
      console.warn('Skipping entry without slug');
      continue;
    }
    if (licenseNote && !options.includeRisky) {
      console.log(`Skipping ${slug} (${title || 'sin título'}) por licencia: ${licenseNote}`);
      continue;
    }
    if (!files.length) {
      console.warn(`No files listed for ${slug}`);
    }

    const monumentDir = path.join(outputDir, slug);
    if (!options.dryRun) {
      await ensureDir(monumentDir);
    }

    const collected = [];
    for (const fileTitle of files) {
      try {
        const { info } = await fetchFileMetadata(fileTitle);
        const normalizedName = normalizeFileName(fileTitle);
        const targetPath = path.join(monumentDir, normalizedName);
        const localPath = path.relative(process.cwd(), targetPath).replace(/\\/g, '/');

        let optimizedSize = null;
        let originalSize = null;
        let optimizedRelativePath = null;
        if (!options.dryRun) {
          const buffer = await downloadBinary(info.url);
          originalSize = buffer.length;
          await ensureDir(path.dirname(targetPath));
          await writeFile(targetPath, buffer);

          const optimizedName = buildOptimizedFilename(normalizedName);
          const optimizedPath = path.join(monumentDir, optimizedName);
          optimizedSize = await generateOptimizedVariant(buffer, optimizedPath);
          optimizedRelativePath = path
            .relative(process.cwd(), optimizedPath)
            .replace(/\\/g, '/');
        }

        collected.push({
          title: title || slug,
          filename: normalizedName,
          url: info.descriptionurl || info.url,
          localPath,
          optimizedPath: optimizedRelativePath,
          width: info.width,
          height: info.height,
          author: stripHtml(info.extmetadata?.Artist?.value),
          credit: stripHtml(info.extmetadata?.Credit?.value),
          license: stripHtml(
            info.extmetadata?.LicenseShortName?.value || info.extmetadata?.License?.value
          ),
          licenseUrl: stripHtml(info.extmetadata?.LicenseUrl?.value),
          source: info.url,
          retrievedAt: new Date().toISOString(),
          originalSize,
          optimizedSize,
          optimizedFilename: optimizedRelativePath ? path.basename(optimizedRelativePath) : null,
          optimizedPath: optimizedRelativePath,
        });
        totalDownloads += 1;
        console.log(`✔ ${slug} → ${normalizedName}`);
      } catch (error) {
        console.warn(`⚠️  Error downloading ${fileTitle} (${slug}): ${error.message}`);
      }
    }

    if (collected.length) {
      attributions[slug] = collected;
    }
  }

  if (!options.dryRun) {
    await ensureDir(path.dirname(attribPath));
    await writeAttributions(attribPath, attributions);
  }

  console.log(`Descargas completadas: ${totalDownloads}`);
  if (!options.dryRun) {
    console.log(`Archivo de atribuciones actualizado en ${path.relative(process.cwd(), attribPath)}`);
  } else {
    console.log('Ejecución en modo dry-run, no se escribieron archivos.');
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
