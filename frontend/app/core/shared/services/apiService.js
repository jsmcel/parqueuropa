let activeContext = null;

export function setApiConfig({ config, tenantId, explicitApiUrl }) {
  if (!config) {
    throw new Error('setApiConfig requires a tenant config object');
  }
  activeContext = { config, tenantId, explicitApiUrl };
}

function requireContext() {
  if (!activeContext) {
    throw new Error(
      'API service not configured. Call setApiConfig({ config, tenantId }) before using it.'
    );
  }
  return activeContext;
}

function buildHeaders(extra = {}) {
  const context = activeContext;
  if (!context?.tenantId) return { ...extra };
  return {
    'X-Tenant-ID': context.tenantId,
    ...extra,
  };
}

/**
 * Handles the response from the fetch API.
 */
const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  let data;

  if (contentType && contentType.indexOf('application/json') !== -1) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text, success: response.ok } : { success: response.ok };
  }

  if (!response.ok) {
    const errorMessage =
      data?.error?.message || data?.message || `HTTP error ${response.status} (${response.statusText})`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

function resolveApiUrl(baseUrl, fallback) {
  if (baseUrl && typeof baseUrl === 'string') return baseUrl;
  return fallback;
}

export const post = async (path, body, additionalHeaders = {}) => {
  const { config, explicitApiUrl } = requireContext();
  const baseUrl = resolveApiUrl(explicitApiUrl, config.API_URL);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: buildHeaders({
        'Content-Type': 'application/json',
        ...additionalHeaders,
      }),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API Service POST Error:', error.message);
    throw error;
  }
};

export const get = async (path, params, additionalHeaders = {}) => {
  const { config, explicitApiUrl } = requireContext();
  const baseUrl = resolveApiUrl(explicitApiUrl, config.API_URL);
  let url = `${baseUrl}${path}`;
  if (params) {
    const queryParams = new URLSearchParams(params);
    url += `?${queryParams.toString()}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(additionalHeaders),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('API Service GET Error:', error.message);
    throw error;
  }
};

// Example usage for specific services:
export const recognizeImage = async (base64Image) => {
  if (!base64Image) {
    throw new Error('No se proporciono imagen en base64');
  }

  const { config, explicitApiUrl } = requireContext();
  const baseUrl = resolveApiUrl(explicitApiUrl, config.API_URL);

  try {
    const response = await fetch(`${baseUrl}/api/recognize`, {
      method: 'POST',
      headers: buildHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        imageBase64: base64Image,
      }),
      timeout: 30000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error en recognizeImage:', error);

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Error de conexion. Verifica que el servidor esta funcionando.');
    }

    throw error;
  }
};

export const getAudioInfo = async (tenantId, pieceId, mode, language = 'es') =>
  get(`/api/audio/${tenantId}/${pieceId}/${mode}/${language}`);

export function getAudioFileUrl(tenantId, pieceId, mode, language = 'es') {
  const baseUrl = getApiBaseUrl();
  const safePieceId = encodeURIComponent(pieceId);
  const safeMode = encodeURIComponent(mode);
  const safeLanguage = encodeURIComponent(language);
  const safeTenant = encodeURIComponent(tenantId);
  return `${baseUrl}/api/audio/${safeTenant}/${safePieceId}/${safeMode}/${safeLanguage}?tenant_id=${safeTenant}`;
}

export function getApiBaseUrl() {
  const { config, explicitApiUrl } = requireContext();
  return resolveApiUrl(explicitApiUrl, config.API_URL);
}

export const sendFeedback = async (rating, comment, deviceInfo) => {
  const { config, explicitApiUrl } = requireContext();
  const baseUrl = resolveApiUrl(explicitApiUrl, config.API_URL);
  try {
    const response = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: buildHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        rating,
        comment: comment || '',
        deviceInfo: deviceInfo || {},
        appVersion: '1.0.1',
      }),
    });

    return handleResponse(response);
  } catch (error) {
    console.error('Error sending feedback:', error);
    throw error;
  }
};
