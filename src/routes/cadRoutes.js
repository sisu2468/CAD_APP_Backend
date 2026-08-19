const express = require('express');
const cadController = require('../controllers/cadController');
const { cadRateLimiter } = require('../middlewares/rateLimit');
const { parseCadUpload } = require('../middlewares/upload');

function extendTimeout(req, res, next) {
  req.setTimeout(180000);
  res.setTimeout(180000);
  next();
}

const router = express.Router();

router.get('/cad/health', cadController.health);

router.post(
  '/process-image',
  extendTimeout,
  cadRateLimiter,
  parseCadUpload,
  cadController.processImage
);
router.post(
  '/process-multi-view',
  extendTimeout,
  cadRateLimiter,
  parseCadUpload,
  cadController.processMultiView
);
router.post(
  '/process-with-pdf',
  extendTimeout,
  cadRateLimiter,
  parseCadUpload,
  cadController.processWithPdf
);

module.exports = router;
