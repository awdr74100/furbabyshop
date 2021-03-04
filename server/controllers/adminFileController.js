import { v4 as uuidv4 } from 'uuid';
import bucket from '../connection/connectGCS';

// eslint-disable-next-line import/prefer-default-export
export const upload = async (req, res) => {
  try {
    // validate req.files
    if (!req.files || !req.files.length) throw new Error('custom/EMPTY_FILES');
    // generate public URLs
    const publicURLs = await Promise.all(
      req.files.map((file) => {
        const filename = `files/${uuidv4()}`;
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
    // end
    return res.send({ success: true, publicURLs });
  } catch (error) {
    if (error.message === 'custom/EMPTY_FILES')
      return res.send({ success: false, message: '禁止欄位輸入為空' });
    return res.status(500).send({ success: false, message: error.message });
  }
};
