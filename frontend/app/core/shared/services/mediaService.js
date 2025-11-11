import { get, getApiBaseUrl } from './apiService.js';

let cachedTenantId = null;
let cachedPayload = null;
let inflightPromise = null;

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const toAbsoluteUrl = (baseUrl, value) => {
  if (!value) return null;
  if (ABSOLUTE_URL_REGEX.test(value)) {
    return value;
  }
  const prefix = value.startsWith('/') ? '' : '/';
  return `${baseUrl}${prefix}${value}`;
};

const withTenantQuery = (url, tenantId) => {
  if (!url || !tenantId) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.get('tenant_id')) {
      parsed.searchParams.set('tenant_id', tenantId);
    }
    return parsed.toString();
  } catch (error) {
    return url;
  }
};

const normalizeMonuments = (monuments = {}, baseUrl, tenantId) => {
  const normalized = {};
  Object.entries(monuments).forEach(([slug, entry]) => {
    if (!entry) return;
    const images = Array.isArray(entry.images)
      ? entry.images.map((image) => {
          const optimizedUrl = image.optimizedAssetUrl
            ? withTenantQuery(toAbsoluteUrl(baseUrl, image.optimizedAssetUrl), tenantId)
            : null;
          const originalLocalUrl = image.originalAssetUrl || image.assetUrl;
          const originalUrl =
            withTenantQuery(toAbsoluteUrl(baseUrl, originalLocalUrl), tenantId) ||
            image.originalUrl ||
            image.url ||
            null;
          const preferredUrl = optimizedUrl || originalUrl;

          return {
            ...image,
            assetUrl: preferredUrl,
            originalAssetUrl: originalUrl,
            optimizedAssetUrl: optimizedUrl,
          };
        })
      : [];

    normalized[slug] = {
      ...entry,
      images,
    };
  });

  return normalized;
};

export async function fetchTenantMediaManifest(tenantId, forceRefresh = false) {
  if (!tenantId) {
    throw new Error('fetchTenantMediaManifest requires a tenantId');
  }

  if (!forceRefresh && cachedPayload && cachedTenantId === tenantId) {
    return cachedPayload;
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = get('/api/tenant-media/monuments')
    .then((payload) => {
      const baseUrl = getApiBaseUrl();
      const normalized = {
        tenant: payload.tenant,
        updatedAt: payload.updatedAt,
        heroSlugs: payload.heroSlugs || [],
        sliderManifest: payload.sliderManifest || { monuments: [] },
        monuments: normalizeMonuments(payload.monuments, baseUrl, tenantId),
      };

      cachedPayload = normalized;
      cachedTenantId = tenantId;
      return normalized;
    })
    .finally(() => {
      inflightPromise = null;
    });

  return inflightPromise;
}

export function clearMediaCache() {
  cachedPayload = null;
  cachedTenantId = null;
  inflightPromise = null;
}
