import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { upload, convert, errorHandling } from '../../middleware/uploadHandler';
import { uploadValidate } from '../../utils/validate';
import { bucket } from '../../connection/connectGoogleCloudStorage';

const router = express.Router();

/* Upload Files */
router.post(
  '/',
  upload.array('images', 5),
  convert,
  errorHandling,
  async (req, res) => {
    try {
      // validate req.files
      const files = await uploadValidate(req.files);
      // upload files
      const publicURLs = await Promise.all(
        files.map((file) => {
          const filename = `products/${uuidv4()}`;
          return bucket
            .file(filename)
            .save(file.buffer, {
              gzip: true,
              resumable: false,
              contentType: file.mimetype,
            })
            .then(
              () => `https://storage.googleapis.com/${bucket.name}/${filename}`,
            );
        }),
      );
      // send response
      return res.send({ success: true, publicURLs });
    } catch (error) {
      if (error.name === 'ValidationError' && error.details)
        return res.status(400).send({ success: false, message: error.message }); // invalid field value
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

export default router;
