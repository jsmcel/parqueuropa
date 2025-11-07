import museoFerrocarrilConfig from './museo_ferrocarril/config';
import parqueEuropaConfig from './parque_europa/config';

export const DEFAULT_TENANT_ID = 'museo_ferrocarril';

export const tenants = {
  museo_ferrocarril: {
    id: 'museo_ferrocarril',
    type: 'type1',
    config: museoFerrocarrilConfig,
    aliases: ['museoferrocarril', 'ferrocarril'],
  },
  parque_europa: {
    id: 'parque_europa',
    type: 'type2',
    config: parqueEuropaConfig,
    aliases: ['parqueuropa', 'europa'],
  },
};

export function getTenantDescriptor(tenantId) {
  return tenants[tenantId] || tenants[DEFAULT_TENANT_ID];
}

export function detectTenantId({
  explicitTenantId,
  hostname,
  searchString,
} = {}) {
  if (explicitTenantId && tenants[explicitTenantId]) {
    return explicitTenantId;
  }

  if (searchString) {
    try {
      const params =
        searchString instanceof URLSearchParams
          ? searchString
          : new URLSearchParams(searchString);
      const queryTenant =
        params.get('tenant') || params.get('tenant_id') || params.get('t');
      if (queryTenant && tenants[queryTenant]) {
        return queryTenant;
      }
    } catch (error) {
      console.warn('Failed to parse search params for tenant detection', error);
    }
  }

  if (hostname) {
    const normalizedHost = hostname.toLowerCase();
    const match = Object.values(tenants).find((tenant) =>
      tenant.aliases?.some((alias) => normalizedHost.includes(alias))
    );
    if (match) {
      return match.id;
    }
  }

  return DEFAULT_TENANT_ID;
}
