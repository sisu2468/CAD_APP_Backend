const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../config/logger');

const FILE_FIELDS = new Set(['image', 'images', 'file', 'files', 'photo', 'photos']);
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp']);
const MIME_TO_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/x-ms-bmp': '.bmp',
  'application/octet-stream': '',
};
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const HEADER_SEP = Buffer.from('\r\n\r\n');

const uploadDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

function getBoundary(contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  return match ? (match[1] || match[2]).trim() : null;
}

function parseDisposition(header) {
  const nameMatch = /(?:^|;)\s*name\*=(?:UTF-8'')?([^;]+)|(?:^|;)\s*name="?([^";\s]+)"?/i.exec(
    header
  );
  const filenameMatch =
    /(?:^|;)\s*filename\*=(?:UTF-8'')?([^;]+)|(?:^|;)\s*filename="?([^";]+)"?/i.exec(header);
  const rawName = (nameMatch?.[1] || nameMatch?.[2] || '').trim().replace(/^"|"$/g, '');
  const rawFilename = (filenameMatch?.[1] || filenameMatch?.[2] || '').trim().replace(/^"|"$/g, '');
  return {
    name: decodeURIComponent(rawName),
    filename: decodeURIComponent(rawFilename),
  };
}

function sniffExtension(body, mime, filename) {
  if (body.length >= 8) {
    if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) {
      return '.png';
    }
    if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
      return '.jpg';
    }
    if (body[0] === 0x47 && body[1] === 0x49 && body[2] === 0x46) {
      return '.gif';
    }
    if (body[0] === 0x42 && body[1] === 0x4d) {
      return '.bmp';
    }
  }
  const fromName = path.extname(filename || '').toLowerCase();
  if (ALLOWED_EXT.has(fromName)) {
    return fromName;
  }
  return MIME_TO_EXT[mime] || '';
}

function isLikelyBinary(body) {
  if (body.length < 24) {
    return false;
  }
  let nonText = 0;
  const sample = Math.min(body.length, 512);
  for (let i = 0; i < sample; i += 1) {
    const byte = body[i];
    if (byte === 0 || (byte < 9 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d)) {
      nonText += 1;
    }
  }
  return nonText / sample > 0.05;
}

function shouldTreatAsFile({ name, filename, mime, body }) {
  if (!body.length) {
    return false;
  }
  const ext = sniffExtension(body, mime, filename);
  if (ext) {
    return true;
  }
  if (filename) {
    return true;
  }
  if (mime && mime.startsWith('image/')) {
    return true;
  }
  if (FILE_FIELDS.has(name) && isLikelyBinary(body)) {
    return true;
  }
  return FILE_FIELDS.has(name) && body.length > 100;
}

function splitParts(buffer, boundary) {
  const delim = Buffer.from(`--${boundary}`);
  const parts = [];
  let cursor = buffer.indexOf(delim);
  if (cursor === -1) {
    return parts;
  }
  cursor += delim.length;
  while (cursor < buffer.length) {
    if (buffer[cursor] === 0x0d && buffer[cursor + 1] === 0x0a) {
      cursor += 2;
    }
    if (buffer[cursor] === 0x2d && buffer[cursor + 1] === 0x2d) {
      break;
    }
    const next = buffer.indexOf(delim, cursor);
    if (next === -1) {
      break;
    }
    let part = buffer.subarray(cursor, next);
    if (part.length >= 2 && part[part.length - 2] === 0x0d && part[part.length - 1] === 0x0a) {
      part = part.subarray(0, part.length - 2);
    }
    if (part.length) {
      parts.push(part);
    }
    cursor = next + delim.length;
  }
  return parts;
}

function readRequestBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES) {
        const err = new Error('Upload too large (max 20MB)');
        err.statusCode = 400;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function saveFilePart(name, filename, mime, body) {
  const ext = sniffExtension(body, mime, filename) || '.png';
  const originalname = path.basename(filename || `image${ext}`);
  const safeName = path.extname(originalname) ? originalname : `${originalname}${ext}`;
  const stored = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const filepath = path.join(uploadDir, stored);
  fs.writeFileSync(filepath, body);
  return {
    fieldname: name || 'image',
    originalname: safeName,
    mimetype: mime && mime.startsWith('image/') ? mime : `image/${ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1)}`,
    path: filepath,
    size: body.length,
  };
}

async function parseCadUpload(req, res, next) {
  try {
    const contentType = req.headers['content-type'] || '';
    req.body = req.body && typeof req.body === 'object' ? req.body : {};
    req.files = Array.isArray(req.files) ? req.files : [];

    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return next();
    }

    const boundary = getBoundary(contentType);
    if (!boundary) {
      const err = new Error('Invalid Content-Type: multipart boundary is missing');
      err.statusCode = 400;
      throw err;
    }

    const buffer = await readRequestBuffer(req);
    const parts = splitParts(buffer, boundary);
    const partSummary = [];

    for (const part of parts) {
      const sep = part.indexOf(HEADER_SEP);
      if (sep === -1) {
        continue;
      }
      const headerText = part.subarray(0, sep).toString('utf8');
      const body = part.subarray(sep + HEADER_SEP.length);
      const headers = {};
      headerText.split(/\r\n/).forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > 0) {
          headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
        }
      });
      const { name, filename } = parseDisposition(headers['content-disposition'] || '');
      const mime = (headers['content-type'] || '').toLowerCase();
      const asFile = shouldTreatAsFile({ name, filename, mime, body });

      partSummary.push({
        name,
        filename: filename || null,
        mime: mime || null,
        bytes: body.length,
        asFile,
      });

      if (!name) {
        continue;
      }
      if (asFile) {
        req.files.push(saveFilePart(name, filename, mime, body));
      } else {
        req.body[name] = body.toString('utf8');
      }
    }

    logger.info('CAD multipart parsed', { path: req.path, parts: partSummary });
    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        '========== CAD MULTIPART ==========',
        `path:          ${req.originalUrl || req.path}`,
        `content-type:  ${req.headers['content-type'] || '(none)'}`,
        `parts:         ${partSummary.length}`,
        ...partSummary.map(
          (part, i) =>
            `  [${i}] name=${part.name || '(none)'} filename=${part.filename || '(none)'} mime=${part.mime || '(none)'} bytes=${part.bytes} file=${part.asFile ? 'YES' : 'no'}`
        ),
        '===================================',
        '',
      ].join('\n')
    );
    return next();
  } catch (err) {
    err.statusCode = err.statusCode || 400;
    return next(err);
  }
}

module.exports = {
  parseCadUpload,
  uploadDir,
};
