const fs = require('fs');
const path = require('path');

const previewDir = path.resolve(process.cwd(), 'cad-previews');
fs.mkdirSync(previewDir, { recursive: true });

function publicBase(req) {
  const host = req.get('host') || 'localhost:8000';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`;
}

function saveBase64File(b64, filename) {
  if (!b64 || !filename) {
    return null;
  }
  const raw = String(b64).replace(/^data:[^;]+;base64,/, '');
  const filepath = path.join(previewDir, path.basename(filename));
  fs.writeFileSync(filepath, Buffer.from(raw, 'base64'));
  return filepath;
}

function materializePreview(req, payload) {
  const outputName = payload.output_name || 'cad_output';
  const pngName = payload.png_filename || `${outputName}_outline.png`;
  const pdfName = payload.pdf_filename || (payload.pdf_base64 ? `${outputName}.pdf` : null);

  const pngPath = saveBase64File(payload.png_base64 || payload.image, pngName);
  const pdfPath = saveBase64File(payload.pdf_base64, pdfName);

  const origin = publicBase(req);
  const pngUrl = pngPath ? `${origin}/cad-previews/${encodeURIComponent(path.basename(pngPath))}` : payload.png_url;
  const pdfUrl = pdfPath ? `${origin}/cad-previews/${encodeURIComponent(path.basename(pdfPath))}` : payload.pdf_url;
  const image =
    payload.image ||
    (payload.png_base64 ? `data:image/png;base64,${payload.png_base64}` : null);

  return {
    ...payload,
    image,
    png_url: pngUrl,
    pdf_url: pdfUrl,
    png_filename: pngName,
    pdf_filename: pdfName,
    preview_path: pngPath,
  };
}

module.exports = {
  previewDir,
  materializePreview,
  publicBase,
};
