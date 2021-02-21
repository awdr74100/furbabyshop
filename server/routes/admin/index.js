import express from 'express';
import argon2 from 'argon2';
import { verify } from 'jsonwebtoken';
import { signUpValidate, signInValidate } from '../../utils/validate';
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
router.post('/signup', async (req, res) => {
  try {
    // validate req.body
    const { username, email, password } = await signUpValidate(req.body);
    // generate photo
    const prefix = username.slice(0, 1).toLocaleUpperCase();
    const photo = `https://fakeimg.pl/96x96/282828/fff/?text=${prefix}&font_size=48&font=noto`;
    // hash password
    const hashPassword = await argon2.hash(password, { type: argon2.argon2id });
    // set user
    const user = new User({
      email,
      draws: 0,
      role: 'admin',
      tokenVersion: 0,
      accounts: [{ kind: 'custom', photo, username, password: hashPassword }],
    });
    // save user
    await user.save();
    // end
    return res.send({ success: true, message: '註冊成功' });
  } catch (error) {
    if (error.name === 'ValidationError' && error.details)
      return res.status(400).send({ success: false, message: error.message }); // invalid field value
    if (
      error.errors &&
      error.errors['accounts.0.username'] &&
      error.errors['accounts.0.username'].kind === 'unique'
    )
      return res.send({ success: false, message: '用戶名已存在' }); // username already exist
    if (
      error.errors &&
      error.errors.email &&
      error.errors.email.kind === 'unique'
    )
      return res.send({ success: false, message: '信箱已被使用' }); // email already exist
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
});

/* Sign In */
router.post('/signin', async (req, res) => {
  try {
    // validate req.body
    const { usernameOrEmail, password } = await signInValidate(req.body);
    // find user
    const key = usernameOrEmail.includes('@') ? 'email' : 'accounts.username';
    const user = await User.findOne({ [key]: usernameOrEmail });
    // check user
    if (!user) throw new Error('custom/USER_NOT_FOUND');
    // check role
    if (user.role !== 'admin') throw new Error('custom/INVALID_ROLE');
    // check account
    const account = user.accounts.find(({ kind }) => kind === 'custom');
    if (!account) throw new Error('custom/ACCOUNT_NOT_FOUND');
    // verify password
    const verifyResult = await argon2.verify(account.password, password);
    if (!verifyResult) throw new Error('custom/INVALID_PASSWORD');
    // send tokens (access, refresh)
    sendAccessToken(res, generateAccessToken(user, '15m'));
    sendRefreshToken(res, generateRefreshToken(user, '4h'), user.role);
    // remove sensitive data
    const filterAccounts = user.toJSON().accounts.map((_account) => {
      const cacheAccount = _account;
      delete cacheAccount.password;
      return cacheAccount;
    });
    // end
    return res.send({
      success: true,
      user: {
        email: user.email,
        photoUrl: user.photoUrl,
        draws: user.draws,
        role: user.role,
        accounts: filterAccounts,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError' && error.details)
      return res.status(400).send({ success: false, message: error.message }); // invalid field value
    if (error.message === 'custom/USER_NOT_FOUND')
      return res.send({ success: false, message: '帳號或密碼錯誤' }); // user not found
    if (error.message === 'custom/INVALID_ROLE')
      return res.send({ success: false, message: '帳號或密碼錯誤' }); // invalid role
    if (error.message === 'custom/ACCOUNT_NOT_FOUND')
      return res.send({ success: false, message: '帳號或密碼錯誤' }); // account not found
    if (error.message === 'custom/INVALID_PASSWORD')
      return res.send({ success: false, message: '帳號或密碼錯誤' }); // invalid password
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
});

/* Sign Out */
router.post('/signout', async (req, res) => {
  const { accessToken } = req.cookies;
  try {
    // verify access token
    const { id, role } = verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    // check role
    if (role !== 'admin') throw new Error('custom/INVALID_ROLE');
    // find user
    const user = await User.findById(id);
    // check user
    if (!user) throw new Error('custom/ACCOUNT_HAS_BEEN_REVOKED');
    // update token version (revoke refresh token)
    user.tokenVersion += 1;
    await User.updateOne({ _id: user.id }, { tokenVersion: user.tokenVersion });
    // send tokens (clear)
    sendClearTokens(res, 'admin');
    // end
    return res.send({ success: true, message: '已登出' });
  } catch {
    // send tokens (clear)
    sendClearTokens(res, 'admin');
    // end
    return res.send({ success: true, message: '已登出' });
  }
});

/* Refresh Token */
router.post('/refresh_token', async (req, res) => {
  const { refreshToken } = req.cookies;
  try {
    // verify refresh token
    const { id, role, tokenVersion } = verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    // check role
    if (role !== 'admin') throw new Error('custom/INVALID_ROLE');
    // find user
    const user = await User.findById(id);
    // check user
    if (!user) throw new Error('custom/ACCOUNT_HAS_BEEN_REVOKED');
    // check token version
    if (user.tokenVersion !== tokenVersion) {
      throw new Error('custom/TOKEN_HAS_BEEN_REVOKED');
    }
    // update token version (revoke refresh token)
    user.tokenVersion += 1;
    await User.updateOne({ _id: user.id }, { tokenVersion: user.tokenVersion });
    // send tokens (access, refresh)
    sendAccessToken(res, generateAccessToken(user, '15m'));
    sendRefreshToken(res, generateRefreshToken(user, '4h'), user.role);
    // remove sensitive data
    const filterAccounts = user.toJSON().accounts.map((_account) => {
      const cacheAccount = _account;
      delete cacheAccount.password;
      return cacheAccount;
    });
    // end
    return res.send({
      success: true,
      user: {
        email: user.email,
        photoUrl: user.photoUrl,
        draws: user.draws,
        role: user.role,
        accounts: filterAccounts,
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
