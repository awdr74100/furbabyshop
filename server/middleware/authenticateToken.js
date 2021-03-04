import { verify } from 'jsonwebtoken';

const jwtErrorHandler = (res, error) => {
  if (error.message === 'jwt must be provided')
    return res.status(401).send({ success: false, message: '未攜帶令牌' });
  if (error.message === 'invalid token')
    return res.status(401).send({ success: false, message: '無效令牌' });
  if (error.message === 'jwt malformed')
    return res.status(401).send({ success: false, message: '格式錯誤' });
  if (error.message === 'jwt signature is required')
    return res.status(401).send({ success: false, message: '需要簽名' });
  if (error.message === 'invalid signature')
    return res.status(401).send({ success: false, message: '無效簽名' });
  if (error.message === 'jwt expired')
    return res.status(401).send({ success: false, message: '令牌已過期' });
  return res.status(401).send({ success: false, message: error.message });
};

export const isAdmin = (req, res, next) => {
  try {
    const decoded = verify(
      req.cookies.accessToken,
      process.env.ACCESS_TOKEN_SECRET,
    );
    if (decoded.role !== 'admin') throw new Error('custom/INVALID_ROLE');
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return jwtErrorHandler(res, error);
    if (error.message === 'custom/INVALID_ROLE')
      return res.status(403).send({ success: false, message: '權限不足' });
    return res.status(500).send({ success: false, message: error.message });
  }
};

export const isUser = (req, res, next) => {
  try {
    const decoded = verify(
      req.cookies.accessToken,
      process.env.ACCESS_TOKEN_SECRET,
    );
    if (decoded.role !== 'user') throw new Error('custom/INVALID_ROLE');
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return jwtErrorHandler(res, error);
    if (error.message === 'custom/INVALID_ROLE')
      return res.status(403).send({ success: false, message: '權限不足' });
    return res.status(500).send({ success: false, message: error.message });
  }
};
