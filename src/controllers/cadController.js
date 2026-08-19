const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');
const config = require('../config/config');
const cadModelService = require('../services/cadModelService');
const { uploadDir } = require('../middlewares/upload');

const BASE64_KEYS = ['image', 'file', 'files', 'photo', 'data', 'imageBase64'];

function uploadedFiles(req) {
  if (Array.isArray(req.files) && req.files.length) {
    return req.files;
  }
  if (req.file) {
    return [req.file];
  }
  return [];
}

function extractBase64Candidate(raw) {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'string') {
    if (raw.startsWith('blob:')) {
      return null;
    }
    return raw;
  }
  if (typeof raw === 'object') {
    const nested = raw.base64 || raw.data || raw.image || raw.uri;
    if (typeof nested === 'string' && !nested.startsWith('blob:')) {
      return nested;
    }
  }
  return null;
}

async function fileFromBase64(value, filenameHint) {
  const candidate = extractBase64Candidate(value);
  if (typeof candidate !== 'string' || candidate.length < 100) {
    return null;
  }

  let ext = path.extname(filenameHint || '').replace('.', '').toLowerCase() || 'png';
  if (ext === 'jpeg') {
    ext = 'jpg';
  }
  let data = candidate;
  const dataUrl = candidate.match(/^data:image\/([\w+.-]+);base64,(.+)$/i);
  if (dataUrl) {
    ext = dataUrl[1].toLowerCase() === 'jpeg' ? 'jpg' : dataUrl[1].toLowerCase();
    data = dataUrl[2];
  } else if (!/^[A-Za-z0-9+/=\s]+$/.test(candidate)) {
    return null;
  }

  const buffer = Buffer.from(data.replace(/\s/g, ''), 'base64');
  if (!buffer.length) {
    return null;
  }

  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  await fs.writeFile(filepath, buffer);

  return {
    path: filepath,
    originalname: filenameHint || `image.${ext}`,
    mimetype: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  };
}

async function resolveImages(req) {
  const files = uploadedFiles(req);
  if (files.length) {
    return files;
  }

  const filenameHint = req.body?.filename || req.body?.originalname;
  for (const key of BASE64_KEYS) {
    const raw = req.body?.[key];
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    const file = await fileFromBase64(candidate, filenameHint);
    if (file) {
      req.files = [file];
      return [file];
    }
  }

  return [];
}

function sniffFormat(filepath) {
  try {
    const header = Buffer.alloc(8);
    const fd = fsSync.openSync(filepath, 'r');
    fsSync.readSync(fd, header, 0, 8, 0);
    fsSync.closeSync(fd);
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
      return 'PNG';
    }
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return 'JPEG';
    }
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
      return 'GIF';
    }
    if (header[0] === 0x42 && header[1] === 0x4d) {
      return 'BMP';
    }
    return 'unknown';
  } catch {
    return 'unreadable';
  }
}

function requestUrl(req) {
  const host = req.get('host') || `localhost:${config.port}`;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}${req.originalUrl || req.url}`;
}

function logCadRequest(req, images, modelPath) {
  const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
  const lines = [
    '',
    '========== CAD REQUEST ==========',
    `time:          ${new Date().toISOString()}`,
    `method:        ${req.method}`,
    `url:           ${requestUrl(req)}`,
    `path:          ${req.originalUrl || req.path}`,
    `content-type:  ${req.headers['content-type'] || '(none)'}`,
    `forward-to:    ${config.cadModel.apiUrl}${modelPath}`,
    `body keys:     ${bodyKeys.length ? bodyKeys.join(', ') : '(none)'}`,
    `output_name:   ${req.body?.output_name || '(none)'}`,
    `filename:      ${req.body?.filename || req.body?.originalname || '(none)'}`,
    `images:        ${images.length}`,
  ];

  images.forEach((file, index) => {
    const size =
      file.size ||
      (file.path && fsSync.existsSync(file.path) ? fsSync.statSync(file.path).size : 0);
    const format = file.path ? sniffFormat(file.path) : 'unknown';
    const ok = size > 0 && format !== 'unreadable' && format !== 'unknown';
    lines.push(`  [${index}] transferred: ${ok ? 'YES' : 'NO / check format'}`);
    lines.push(`      originalname: ${file.originalname || '(none)'}`);
    lines.push(`      mimetype:     ${file.mimetype || '(none)'}`);
    lines.push(`      size:         ${size} bytes`);
    lines.push(`      format:       ${format}`);
    lines.push(`      saved:        ${file.path || '(none)'}`);
  });

  lines.push('=================================');
  lines.push('');
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

function logCadMissing(req) {
  const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
  // eslint-disable-next-line no-console
  console.log(
    [
      '',
      '========== CAD REQUEST ==========',
      `time:          ${new Date().toISOString()}`,
      `method:        ${req.method}`,
      `url:           ${requestUrl(req)}`,
      `path:          ${req.originalUrl || req.path}`,
      `content-type:  ${req.headers['content-type'] || '(none)'}`,
      `body keys:     ${bodyKeys.length ? bodyKeys.join(', ') : '(none)'}`,
      'images:        0',
      'transferred:   NO — no image data received',
      '=================================',
      '',
    ].join('\n')
  );
}

function logCadResult(req, result, filename, returned) {
  // eslint-disable-next-line no-console
  console.log(
    [
      '',
      '========== CAD RESPONSE ==========',
      `url:           ${requestUrl(req)}`,
      `filename:      ${filename}`,
      `content-type:  ${result.contentType}`,
      `bytes:         ${result.buffer.length}`,
      `returned:      ${returned}`,
      '=================================',
      '',
    ].join('\n')
  );
}

async function cleanupUploads(req) {
  const files = uploadedFiles(req);
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
}

function filenameFromDisposition(disposition, fallback = 'cad_output.dxf') {
  if (!disposition) {
    return fallback;
  }
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : fallback;
}

function sendCadResult(req, res, result) {
  const filename = filenameFromDisposition(result.contentDisposition, 'cad_output.dxf');
  const accept = String(req.headers.accept || '');
  const wantsFile =
    req.query.download === '1' ||
    req.query.format === 'file' ||
    accept.includes('application/dxf') ||
    accept.includes('application/pdf') ||
    accept.includes('application/octet-stream');

  if (wantsFile) {
    logCadResult(req, result, filename, 'raw file download');
    res.setHeader('Content-Type', result.contentType);
    if (result.contentDisposition) {
      res.setHeader('Content-Disposition', result.contentDisposition);
    }
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
    return res.send(result.buffer);
  }

  logCadResult(req, result, filename, 'JSON { status, data.filename, data.file(base64) }');

  return res.json({
    status: 'success',
    data: {
      filename,
      contentType: result.contentType,
      file: result.buffer.toString('base64'),
      output_name: req.body?.output_name || path.parse(filename).name,
    },
  });
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function missingImageError(req) {
  const contentType = req.headers['content-type'] || 'none';
  const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
  logger.warn('CAD upload missing image', { contentType, bodyKeys, path: req.path });
  return badRequest(
    `No image file provided. Send multipart/form-data with field "image", "file", or "files". Received Content-Type: ${contentType}${
      bodyKeys.length ? `; body keys: ${bodyKeys.join(', ')}` : ''
    }`
  );
}

exports.health = catchAsync(async (_req, res) => {
  const modelHealth = await cadModelService.health();
  const healthy = modelHealth.status === 'healthy';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    message: healthy
      ? 'CAD Extraction API is running'
      : modelHealth.message || 'CAD model service is unavailable',
    data: modelHealth,
  });
});

exports.processImage = catchAsync(async (req, res) => {
  try {
    const images = await resolveImages(req);
    if (!images.length) {
      logCadMissing(req);
      throw missingImageError(req);
    }

    logCadRequest(req, images, '/process-image');

    const result = await cadModelService.postToModel('/process-image', {
      files: [{ field: 'image', file: images[0] }],
      fields: { output_name: req.body.output_name },
    });

    return sendCadResult(req, res, result);
  } finally {
    await cleanupUploads(req);
  }
});

exports.processMultiView = catchAsync(async (req, res) => {
  try {
    const images = await resolveImages(req);
    if (!images.length) {
      logCadMissing(req);
      throw missingImageError(req);
    }

    logCadRequest(req, images, '/process-multi-view');

    const result = await cadModelService.postToModel('/process-multi-view', {
      files: images.map((file) => ({ field: 'images', file })),
      fields: {
        output_name: req.body.output_name,
        view_types: req.body.view_types,
      },
    });

    return sendCadResult(req, res, result);
  } finally {
    await cleanupUploads(req);
  }
});

exports.processWithPdf = catchAsync(async (req, res) => {
  try {
    const images = await resolveImages(req);
    if (!images.length) {
      logCadMissing(req);
      throw missingImageError(req);
    }

    logCadRequest(req, images, '/process-with-pdf');

    const result = await cadModelService.postToModel('/process-with-pdf', {
      files: [{ field: 'image', file: images[0] }],
      fields: { output_name: req.body.output_name },
    });

    return sendCadResult(req, res, result);
  } finally {
    await cleanupUploads(req);
  }
});
