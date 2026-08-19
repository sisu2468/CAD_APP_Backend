const fs = require('fs/promises');
const config = require('../config/config');
const logger = require('../config/logger');

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function appendFile(form, fieldName, file) {
  const buffer = await fs.readFile(file.path);
  const blob = new Blob([buffer], { type: file.mimetype || 'application/octet-stream' });
  form.append(fieldName, blob, file.originalname || 'image.png');
}

async function postToModel(pathname, { files = [], fields = {} } = {}) {
  const form = new FormData();

  for (const { field, file } of files) {
    await appendFile(form, field, file);
  }

  const outgoing = { format: 'json', ...fields };
  for (const [key, value] of Object.entries(outgoing)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      form.append(key, String(value));
    }
  }

  let response;
  try {
    response = await fetch(`${config.cadModel.apiUrl}${pathname}`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(config.cadModel.timeoutMs),
    });
  } catch (err) {
    logger.error('CAD model request failed', { message: err.message, pathname });
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw createHttpError(504, 'CAD model service timed out');
    }
    throw createHttpError(503, 'CAD model service is unavailable');
  }

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let message = 'CAD processing failed';
    if (contentType.includes('application/json')) {
      const body = await response.json().catch(() => ({}));
      message = body.error || body.message || message;
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        message = text.slice(0, 500);
      }
    }
    throw createHttpError(response.status >= 400 ? response.status : 502, message);
  }

  if (contentType.includes('application/json')) {
    const payload = await response.json();
    return { kind: 'json', payload };
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    kind: 'file',
    buffer: Buffer.from(arrayBuffer),
    contentType: contentType || 'application/octet-stream',
    contentDisposition: response.headers.get('content-disposition'),
  };
}

async function health() {
  try {
    const response = await fetch(`${config.cadModel.apiUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return { status: 'unhealthy', message: 'CAD model service returned an error' };
    }
    const body = await response.json().catch(() => ({}));
    return { status: 'healthy', model: body };
  } catch {
    return { status: 'unavailable', message: 'CAD model service is unavailable' };
  }
}

module.exports = {
  postToModel,
  health,
};
