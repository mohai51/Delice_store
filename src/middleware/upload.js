const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const OPTIMIZED_DIR = path.join(UPLOADS_DIR, 'optimized');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// Ensure directories exist
[UPLOADS_DIR, OPTIMIZED_DIR, THUMBNAILS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configure Multer storage to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    cb(null, `${cleanBase}_${uniqueSuffix}${ext}`);
  }
});

// Strict MIME type & file extension validation
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
    return cb(new Error('Invalid file type. Only JPG, PNG, and WebP raster images are permitted.'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB, 10) || 5) * 1024 * 1024
  }
});

// Process uploaded image with Sharp to generate optimized WebP and thumbnail
async function processUploadedImage(filePath, originalFilename) {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);

  const webpFilename = `${baseName}.webp`;
  const thumbFilename = `thumb_${baseName}.webp`;

  const webpPath = path.join(OPTIMIZED_DIR, webpFilename);
  const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);

  // Read metadata
  const image = sharp(filePath);
  const metadata = await image.metadata();

  // 1. Generate optimized WebP
  await sharp(filePath)
    .webp({ quality: 85, effort: 4 })
    .toFile(webpPath);

  // 2. Generate crisp square thumbnail
  await sharp(filePath)
    .resize(320, 320, { fit: 'cover', position: 'center' })
    .webp({ quality: 80 })
    .toFile(thumbPath);

  const stats = fs.statSync(filePath);

  return {
    filename: path.basename(filePath),
    originalName: originalFilename,
    mimeType: `image/${ext.replace('.', '')}`,
    sizeBytes: stats.size,
    dimensions: {
      width: metadata.width || 0,
      height: metadata.height || 0
    },
    url: `/uploads/${path.basename(filePath)}`,
    optimizedWebpUrl: `/uploads/optimized/${webpFilename}`,
    thumbnailUrl: `/uploads/thumbnails/${thumbFilename}`
  };
}

module.exports = {
  upload,
  processUploadedImage
};
