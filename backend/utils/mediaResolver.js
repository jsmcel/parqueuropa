const fs = require('fs');
const path = require('path');
const { getTenantPaths } = require('./tenantResolver');

const mediaCache = new Map();

function sanitizeSegment(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || null;
}

function sanitizeFilename(value) {
  if (typeof value !== 'string') return null;
  const basename = path.basename(value);
  const normalized = basename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^-|-$|^\.+/g, '');
  return normalized || null;
}

function loadJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`mediaResolver: Failed to load JSON from ${filePath}`, error);
    return null;
  }
}

function getTenantMediaPaths(tenantId) {
  const tenantPaths = getTenantPaths(tenantId);
  const mediaDir = path.join(tenantPaths.tenantDir, 'media');
  return {
    mediaDir,
    sliderManifestPath: path.join(mediaDir, 'slider.manifest.json'),
    attributionsPath: path.join(mediaDir, 'ATTRIBUTIONS.json'),
    monumentsDir: path.join(mediaDir, 'monuments'),
  };
}

function normalizeAttributionEntry(entry, slug, monumentsDir) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const safeSlug = sanitizeSegment(slug);
  const filename =
    sanitizeFilename(entry.filename) ||
    sanitizeFilename(entry.localPath) ||
    sanitizeFilename(entry.url || entry.source || '');

  const absolutePath =
    safeSlug && filename ? path.join(monumentsDir, safeSlug, filename) : null;
  const fileExists = absolutePath ? fs.existsSync(absolutePath) : false;

  const assetUrl =
    safeSlug && filename && fileExists
      ? `/api/tenant-media/file/${safeSlug}/${filename}`
      : null;

  const optimizedFilename =
    sanitizeFilename(entry.optimizedFilename) || sanitizeFilename(entry.optimizedPath);
  const optimizedAbsolutePath =
    safeSlug && optimizedFilename ? path.join(monumentsDir, safeSlug, optimizedFilename) : null;
  const optimizedExists = optimizedAbsolutePath ? fs.existsSync(optimizedAbsolutePath) : false;
  const optimizedAssetUrl =
    safeSlug && optimizedFilename && optimizedExists
      ? `/api/tenant-media/file/${safeSlug}/${optimizedFilename}`
      : null;

  return {
    title: entry.title || null,
    filename: filename || null,
    width: entry.width || null,
    height: entry.height || null,
    credit: entry.credit || null,
    author: entry.author || null,
    license: entry.license || null,
    licenseUrl: entry.licenseUrl || null,
    originalUrl: entry.url || entry.source || null,
    source: entry.source || null,
    retrievedAt: entry.retrievedAt || null,
    assetUrl: optimizedAssetUrl || assetUrl,
    originalAssetUrl: assetUrl,
    optimizedAssetUrl,
    variants: {
      original: {
        url: assetUrl,
        path: entry.localPath || null,
        size: entry.originalSize || entry.variants?.original?.size || null,
      },
      web: optimizedAssetUrl
        ? {
            url: optimizedAssetUrl,
            path: entry.optimizedPath || entry.variants?.web?.path || null,
            size: entry.optimizedSize || entry.variants?.web?.size || null,
          }
        : null,
    },
    slug,
  };
}

function buildMonumentsPayload(manifestArray, attributions, monumentsDir) {
  const manifestBySlug = {};
  (Array.isArray(manifestArray) ? manifestArray : []).forEach((item) => {
    if (item?.slug) {
      manifestBySlug[item.slug] = item;
    }
  });

  const slugs = new Set([
    ...Object.keys(manifestBySlug),
    ...Object.keys(attributions || {}),
  ]);

  const monuments = {};
  slugs.forEach((slug) => {
    const meta = manifestBySlug[slug] || {};
    const entries = Array.isArray(attributions?.[slug])
      ? attributions[slug]
          .map((entry) => normalizeAttributionEntry(entry, slug, monumentsDir))
          .filter(Boolean)
      : [];

    monuments[slug] = {
      slug,
      title: meta.title || entries[0]?.title || slug,
      city: meta.city || null,
      country: meta.country || null,
      aliases: meta.aliases || [],
      licenseNote: meta.license_note || null,
      wikimediaFiles: meta.wikimedia_files || [],
      images: entries,
    };
  });

  return monuments;
}

function buildTenantMediaDescriptor(tenantId) {
  const mediaPaths = getTenantMediaPaths(tenantId);
  if (!fs.existsSync(mediaPaths.mediaDir)) {
    return null;
  }

  const sliderManifest =
    loadJsonIfExists(mediaPaths.sliderManifestPath) || { monuments: [] };
  const attributions =
    loadJsonIfExists(mediaPaths.attributionsPath) || {};

  const heroSlugsCandidate =
    sliderManifest.hero_slugs || sliderManifest.heroSlugs || [];
  const heroSlugs = Array.isArray(heroSlugsCandidate)
    ? heroSlugsCandidate
    : [];

  const monuments = buildMonumentsPayload(
    sliderManifest.monuments,
    attributions,
    mediaPaths.monumentsDir
  );

  return {
    tenant: tenantId,
    updatedAt: new Date().toISOString(),
    heroSlugs,
    sliderManifest: sliderManifest,
    monuments,
  };
}

function getTenantMediaDescriptor(tenantId) {
  if (mediaCache.has(tenantId)) {
    return mediaCache.get(tenantId);
  }
  const descriptor = buildTenantMediaDescriptor(tenantId);
  if (descriptor) {
    mediaCache.set(tenantId, descriptor);
  }
  return descriptor;
}

function invalidateTenantMediaCache(tenantId) {
  if (tenantId) {
    mediaCache.delete(tenantId);
  } else {
    mediaCache.clear();
  }
}

function resolveTenantMediaFile(tenantId, slug, filename) {
  const paths = getTenantMediaPaths(tenantId);
  const safeSlug = sanitizeSegment(slug);
  const safeFilename = sanitizeFilename(filename);
  if (!safeSlug || !safeFilename) {
    return null;
  }
  const absolutePath = path.join(paths.monumentsDir, safeSlug, safeFilename);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return {
    absolutePath: path.resolve(absolutePath),
    filename: safeFilename,
  };
}

module.exports = {
  getTenantMediaDescriptor,
  invalidateTenantMediaCache,
  resolveTenantMediaFile,
};
