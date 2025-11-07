import { get } from '../../shared/services/apiService.js';

export const fetchTenantConfig = () => get('/api/tenant-config');

export const fetchAllCoordinates = () => get('/api/coordinates/all');

export const fetchNearestMonument = (params) =>
  get('/api/coordinates/nearest', params);

export const fetchMonumentById = (monumentId) =>
  get(`/api/coordinates/${encodeURIComponent(monumentId)}`);
