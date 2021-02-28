import multer from 'multer';
import heicConvert from 'heic-convert';

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    const rx = /\.(jpe?g|gif|png|bmp|webp|hei[cf])$/i;
    if (rx.test(file.originalname)) return cb(null, true);
    return cb(new Error('Invalid image type'), false);
  },
  limits: { fileSize: 1024 * 1024 }, // 1MB
});

export const convert = async (req, res, next) => {
  try {
    const converted = await Promise.all(
      req.files.map((file) => {
        const rx = /\.(hei[cf])$/i;
        if (!rx.test(file.originalname)) return file;
        return heicConvert({
          buffer: file.buffer,
          format: 'JPEG',
          quality: 0.9,
        }).then((buffer) => {
          return {
            ...file,
            originalname: file.originalname.replace(/\.(hei[cf])$/i, '.jpg'),
            mimetype: 'image/jpeg',
            buffer,
            size: buffer.byteLength,
          };
        });
      }),
    );
    req.files = converted;
    const err = req.files.some((file) => file.size > 1024 * 1024); // 1MB
    if (err) return next(new Error('File too large'));
    return next();
  } catch (error) {
    return next(error);
  }
};

// eslint-disable-next-line no-unused-vars
export const errorHandling = (err, req, res, next) => {
  if (err.message === 'Invalid image type')
    return res.send({ success: false, message: '不支援的檔案格式' });
  if (err.message === 'File too large')
    return res.send({ success: false, message: '超過圖片限制大小' });
  if (err.message === 'Unexpected field' && err.field === 'images')
    return res.send({ success: false, message: '超過圖片數量限制' });
  if (err.message === 'Unexpected field' && err.field !== 'images')
    return res.send({ success: false, message: '欄位名稱不正確' });
  return res.status(500).send({ success: false, message: err.message });
};
