import express from 'express';
import { body, validationResult } from 'express-validator';
import { hash, verify, argon2id } from 'argon2';
import { verify as jwtVerify } from 'jsonwebtoken';
import User from '../../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../../utils/generateToken';
import {
  sendAccessToken,
  sendRefreshToken,
  sendClearTokens,
} from '../../utils/sendToken';

const router = express.Router();

/* Sign Up */
router.post(
  '/signup',
  body('username').isString().isLength({ min: 6, max: 14 }).isAlphanumeric(),
  body('email').isEmail(),
  body('password').isString().isLength({ min: 6, max: 14 }),
  async (req, res) => {
    // check body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid field value
    const { username, email, password } = req.body;
    try {
      // generate photo url
      const prefix = username.slice(0, 1).toLocaleUpperCase();
      const photoUrl = `https://fakeimg.pl/96x96/282828/fff/?text=${prefix}&font_size=48&font=noto`;
      // hash password
      const hashPassword = await hash(password, { type: argon2id });
      // set user
      const user = new User({
        displayName: '',
        username,
        email,
        password: hashPassword,
        photoUrl,
        draws: 3,
        role: 'user',
        tokenVersion: 0,
        providers: ['custom'],
      });
      // save user
      await user.save();
      // end
      return res.send({ success: true, message: '註冊成功' });
    } catch (error) {
      if (error.errors && error.errors.username) {
        const { kind, message } = error.errors.username;
        if (kind === 'unique')
          return res.send({ success: false, message: '用戶名已存在' }); // username already exist
        return res.send({ success: false, error: message }); // other error
      }
      if (error.errors && error.errors.email) {
        const { kind, message } = error.errors.email;
        if (kind === 'unique')
          return res.send({ success: false, message: '信箱已被使用' }); // email already exist
        return res.send({ success: false, error: message }); // other error
      }
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

/* Sign In */
router.post(
  '/signin',
  body('usernameOrEmail').isString().isLength({ min: 1 }),
  body('password').isString().isLength({ min: 1 }),
  async (req, res) => {
    // check body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid field value
    const { usernameOrEmail, password } = req.body;
    try {
      // find user
      const findKey = usernameOrEmail.includes('@') ? 'email' : 'username';
      const user = await User.findOne({ [`${findKey}`]: usernameOrEmail });
      if (!user) throw new Error('custom/USER_NOT_FOUND');
      // check role
      if (user.role !== 'user') throw new Error('custom/INVALID_ROLE');
      // verify password
      const validPassword = await verify(user.password, password);
      if (!validPassword) throw new Error('custom/INVALID_PASSWORD');
      // send tokens (access, refresh)
      sendAccessToken(res, generateAccessToken(user, '15m'));
      sendRefreshToken(res, generateRefreshToken(user, '4h'), user.role);
      // end
      return res.send({
        success: true,
        user: {
          displayName: user.displayName,
          username: user.username,
          email: user.email,
          photoUrl: user.photoUrl,
          role: user.role,
        },
      });
    } catch (error) {
      if (error.message === 'custom/USER_NOT_FOUND')
        return res.send({ success: false, message: '帳號或密碼錯誤' }); // user not found
      if (error.message === 'custom/INVALID_ROLE')
        return res.send({ success: false, message: '帳號或密碼錯誤' }); // invalid role
      if (error.message === 'custom/INVALID_PASSWORD')
        return res.send({ success: false, message: '帳號或密碼錯誤' }); // invalid password
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

/* Sign Out */
router.post('/signout', async (req, res) => {
  const { accessToken } = req.cookies;
  try {
    // verify access token
    const { id, role } = jwtVerify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET,
    );
    // check role
    if (role !== 'user') throw new Error('custom/INVALID_ROLE');
    // check user
    const user = await User.findById(id);
    if (!user) throw new Error('custom/ACCOUNT_HAS_BEEN_REVOKED');
    // update token version
    user.tokenVersion += 1;
    await User.updateOne({ _id: user.id }, { tokenVersion: user.tokenVersion });
    // send tokens (clear)
    sendClearTokens(res, 'user');
    // end
    return res.send({ success: true, message: '已登出' });
  } catch {
    // send tokens (clear)
    sendClearTokens(res, 'user');
    // end
    return res.send({ success: true, message: '已登出' });
  }
});

/* Refresh Token */
router.post('/refresh_token', async (req, res) => {
  const { refreshToken } = req.cookies;
  try {
    // verify refresh token
    const { id, role, tokenVersion } = jwtVerify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    // check role
    if (role !== 'user') throw new Error('custom/INVALID_ROLE');
    // check user
    const user = await User.findById(id);
    if (!user) throw new Error('custom/ACCOUNT_HAS_BEEN_REVOKED');
    // check token version
    if (user.tokenVersion !== tokenVersion) {
      throw new Error('custom/TOKEN_HAS_BEEN_REVOKED');
    }
    // update token version
    user.tokenVersion += 1;
    await User.updateOne({ _id: user.id }, { tokenVersion: user.tokenVersion });
    // send tokens (access, refresh)
    sendAccessToken(res, generateAccessToken(user, '15m'));
    sendRefreshToken(res, generateRefreshToken(user, '4h'), user.role);
    // end
    return res.send({
      success: true,
      user: {
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        photoUrl: user.photoUrl,
        role: user.role,
      },
    });
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
    if (error.message === 'custom/ACCOUNT_HAS_BEEN_REVOKED')
      return res.status(403).send({ success: false, message: '帳號已註銷' }); // account has been revoked
    if (error.message === 'custom/TOKEN_HAS_BEEN_REVOKED')
      return res.status(403).send({ success: false, message: '令牌已註銷' }); // token has been revoked
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
});

export default router;
