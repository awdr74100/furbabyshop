import { pathToRegexp } from 'path-to-regexp';
import { verify } from 'jsonwebtoken';

const unless = [
  '/api/admin/signin',
  '/api/admin/signout',
  '/api/admin/refresh_token',
  '/api/user/signup',
  '/api/user/signin',
  '/api/user/signout',
  '/api/user/refresh_token',
].map((path) => pathToRegexp(path));

export default (req, res, next) => {
  if (unless.some((rxPath) => rxPath.test(req.originalUrl))) return next();
  const { accessToken } = req.cookies;
  try {
    const decoded = verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const role = req.originalUrl.split('/')[2];
    if (role !== decoded.role) throw new Error('custom/INVALID_ROLE');
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.message === 'jwt must be provided')
      return res.status(401).send({ success: false, message: '未攜帶令牌' }); // jwt must be provided
    if (error.message === 'invalid token')
      return res.status(401).send({ success: false, message: '無效令牌' }); // invalid token
    if (error.message === 'jwt malformed')
      return res.status(401).send({ success: false, message: '格式錯誤' }); // jwt malformed
    if (error.message === 'jwt signature is required')
      return res.status(401).send({ success: false, message: '需要簽名' }); // jwt signature is required
    if (error.message === 'invalid signature')
      return res.status(401).send({ success: false, message: '無效簽名' }); // invalid signature
    if (error.message === 'jwt expired')
      return res.status(401).send({ success: false, message: '令牌已過期' }); // jwt expired
    if (error.message === 'custom/INVALID_ROLE')
      return res.status(403).send({ success: false, message: '權限不足' }); // invalid role
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
};
