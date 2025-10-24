import config from '../config.js'; // Adjusted path to root config.js

/**
 * Handles the response from the fetch API.
 * Checks for network errors and non-successful HTTP status codes.
 * @param {Response} response - The response object from fetch.
 * @returns {Promise<any>} - A promise that resolves with the JSON data if successful.
 * @throws {Error} - An error with a message indicating the failure reason.
 */
const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  let data;

  if (contentType && contentType.indexOf("application/json") !== -1) {
    data = await response.json();
  } else {
    // For non-JSON responses, attempt to get text or return null
    const text = await response.text();
    // Ensure 'success' flag is consistent with response.ok for non-JSON
    data = text ? { message: text, success: response.ok } : { success: response.ok }; 
  }

  if (!response.ok) {
    // If backend sent an error status code, construct an error object with message from data if available
    const errorMessage = data?.error?.message || data?.message || `HTTP error ${response.status} (${response.statusText})`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data; // Attach full data payload to error if needed
    throw error;
  }
  
  // For 2xx responses, return the full data payload
  // The caller will check data.success or data.low_confidence
  return data;
};

/**
 * Performs a POST request to the specified path with the given body.
 * @param {string} path - The API endpoint path (e.g., '/api/recognize').
 * @param {object} body - The request body to be stringified.
 * @returns {Promise<any>} - A promise that resolves with the API response.
 */
export const post = async (path, body) => {
  try {
    const response = await fetch(`${config.API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add other common headers here if needed, e.g., Authorization
      },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  } catch (error) {
    // Log network errors or re-throw for component to handle
    console.error('API Service POST Error:', error.message);
    throw error; // Re-throw the error to be caught by the calling function
  }
};

/**
 * Performs a GET request to the specified path.
 * @param {string} path - The API endpoint path (e.g., '/api/audio/...').
 * @param {object} [params] - Optional query parameters as a key-value object.
 * @returns {Promise<any>} - A promise that resolves with the API response.
 */
export const get = async (path, params) => {
  let url = `${config.API_URL}${path}`;
  if (params) {
    const queryParams = new URLSearchParams(params);
    url += `?${queryParams.toString()}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // Add other common headers here if needed
      },
    });
    // For audio, we might not always expect JSON.
    // The existing /api/audio endpoint streams mp3 directly.
    // handleResponse might need adjustment if it strictly expects JSON for all GETs.
    // For now, keeping it as is, but this is a point of attention.
    // If fetching audio blob/file, handleResponse would need to be bypassed or made more flexible.
    // The current backend /api/audio returns JSON on error, but streams on success.
    // Let's assume for now this GET is for JSON-returning endpoints.
    // If it's specifically for audio, the component might handle fetch differently.
    return handleResponse(response); 
  } catch (error) {
    console.error('API Service GET Error:', error.message);
    throw error; // Re-throw the error to be caught by the calling function
  }
};

// Example usage for specific services:
export const recognizeImage = async (base64Image) => {
  if (!base64Image) {
    throw new Error('No se proporcionó imagen en base64');
  }

  try {
    const response = await fetch(`${config.API_URL}/api/recognize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64Image,
      }),
      timeout: 30000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error en recognizeImage:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Error de conexión. Verifica que el servidor esté funcionando.');
    }
    
    throw error;
  }
};

export const getAudioInfo = async (tenantId, pieceId, mode) => {
    // This is a placeholder if you wanted to get *info* about audio as JSON.
    // The current /api/audio endpoint directly serves the file.
    // So, this function might not be used if components directly use the URL for <Audio source={{uri: ...}}>.
    // Or, it could be used if there was an endpoint that returned metadata.
    // For now, let's assume it's for a hypothetical JSON endpoint.
    return get(`/api/audio/${tenantId}/${pieceId}/${mode}`);
};

/**
 * Constructs the full URL for an audio file.
 * @param {string} tenantId - The tenant ID.
 * @param {string} pieceId - The piece ID.
 * @param {string} mode - The mode of the audio file.
 * @returns {string} - The full URL to the audio file.
 */
export function getAudioFileUrl(tenantId, pieceId, mode) {
  return `${config.API_URL}/api/audio/${tenantId}/${pieceId}/${mode}`;
}

/**
 * Send user feedback (rating and comment)
 * @param {number} rating - Rating from 1 to 5 stars
 * @param {string} comment - Optional user comment
 * @param {object} deviceInfo - Device information
 * @returns {Promise<any>} - API response
 */
export const sendFeedback = async (rating, comment, deviceInfo) => {
  try {
    const response = await fetch(`${config.API_URL}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rating,
        comment: comment || '',
        deviceInfo: deviceInfo || {},
        appVersion: '1.0.1'
      }),
    });

    return handleResponse(response);
  } catch (error) {
    console.error('Error sending feedback:', error);
    throw error;
  }
};

// You can add more specific API functions here as needed.
