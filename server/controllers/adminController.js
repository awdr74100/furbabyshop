import argon2 from 'argon2';
import { verify } from 'jsonwebtoken';
import User from '../models/User';
import { signUpValidate, signInValidate } from '../utils/validate';
import { createAccessToken, createRefreshToken } from '../utils/createToken';
import { sendAccessToken, sendRefreshToken } from '../utils/sendToken';

export const signUp = async (req, res) => {
  try {
    // validate req.body
    const { username, email, password } = await signUpValidate(req.body);
    // generate avatar
    const prefix = username.slice(0, 1).toLocaleUpperCase();
    const avatar = `https://fakeimg.pl/96x96/282828/fff/?text=${prefix}&font_size=48&font=noto`;
    // hash password
    const hashPassword = await argon2.hash(password, { type: argon2.argon2id });
    // set user
    const user = new User({
      email,
      draws: 0,
      role: 'admin',
      tokenVersion: 0,
      accounts: [{ kind: 'custom', avatar, username, password: hashPassword }],
    });
    // save user
    await user.save();
    // end
    return res.send({ success: true, message: '註冊成功' });
  } catch (error) {
    if (error.name === 'ValidationError' && error.details)
      return res.status(400).send({ success: false, message: error.message });
    if (
      error.errors &&
      error.errors['accounts.0.username'] &&
      error.errors['accounts.0.username'].kind === 'unique'
    )
      return res.send({ success: false, message: '用戶名已存在' });
    if (
      error.errors &&
      error.errors.email &&
      error.errors.email.kind === 'unique'
    )
      return res.send({ success: false, message: '信箱已被使用' });
    return res.status(500).send({ success: false, message: error.message });
  }
};

export const signIn = async (req, res) => {
  try {
    // validate req.body
    const { usernameOrEmail, password } = await signInValidate(req.body);
    // find user
    const key = usernameOrEmail.includes('@') ? 'email' : 'accounts.username';
    const user = await User.findOne({ [key]: usernameOrEmail }).lean();
    // check user
    if (!user) throw new Error('custom/USER_NOT_FOUND');
    // check role
    if (user.role !== 'admin') throw new Error('custom/INVALID_ROLE');
    // check account
    const customAccount = user.accounts.find(({ kind }) => kind === 'custom');
    if (!customAccount) throw new Error('custom/ACCOUNT_NOT_FOUND');
    // verify password
    const verifyResult = await argon2.verify(customAccount.password, password);
    if (!verifyResult) throw new Error('custom/INVALID_PASSWORD');
    // remove sensitive data
    const filterAccounts = user.accounts.map((account) => {
      const cache = account;
      delete cache.password;
      return cache;
    });
    // send access and refresh token (cookie)
    sendAccessToken(res, createAccessToken(user, '15m'), '15m');
    sendRefreshToken(res, createRefreshToken(user, '4h'), '4h', user.role);
    // end
    return res.send({
      success: true,
      user: {
        email: user.email,
        draws: user.draws,
        role: user.role,
        accounts: filterAccounts,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError' && error.details)
      return res.status(400).send({ success: false, message: error.message });
    if (error.message === 'custom/USER_NOT_FOUND')
      return res.send({ success: false, message: '帳號或密碼錯誤' });
    if (error.message === 'custom/INVALID_ROLE')
      return res.send({ success: false, message: '帳號或密碼錯誤' });
    if (error.message === 'custom/ACCOUNT_NOT_FOUND')
      return res.send({ success: false, message: '帳號或密碼錯誤' });
    if (error.message === 'custom/INVALID_PASSWORD')
      return res.send({ success: false, message: '帳號或密碼錯誤' });
    return res.status(500).send({ success: false, message: error.message });
  }
};

export const signOut = async (req, res) => {
  try {
    // verify access token
    const { id, role } = verify(
      req.cookies.accessToken,
      process.env.ACCESS_TOKEN_SECRET,
    );
    // check role
    if (role !== 'admin') throw new Error();
    // find user
    const user = await User.findById(id).lean();
    // check user
    if (!user) throw new Error();
    // update token version (for revoke refresh token)
    user.tokenVersion += 1;
    await User.updateOne(
      { _id: user._id },
      { tokenVersion: user.tokenVersion },
    );
    // clear cookies
    res.clearCookie('accessToken', { sameSite: 'strict', path: '/' });
    res.clearCookie('refreshToken', {
      sameSite: 'strict',
      path: `/api/admin/refresh_token`,
    });
    // end
    return res.send({ success: true, message: '已登出' });
  } catch {
    // clear cookies
    res.clearCookie('accessToken', { sameSite: 'strict', path: '/' });
    res.clearCookie('refreshToken', {
      sameSite: 'strict',
      path: `/api/admin/refresh_token`,
    });
    // end
    return res.send({ success: true, message: '已登出' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    // verify refresh token
    const { id, role, tokenVersion } = verify(
      req.cookies.refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    // check role
    if (role !== 'admin') throw new Error('custom/INVALID_ROLE');
    // find user
    const user = await User.findById(id).lean();
    // check user
    if (!user) throw new Error('custom/ACCOUNT_HAS_BEEN_REVOKED');
    // check token version
    if (user.tokenVersion !== tokenVersion) {
      throw new Error('custom/TOKEN_HAS_BEEN_REVOKED');
    }
    // update token version (for revoke refresh token)
    user.tokenVersion += 1;
    await User.updateOne(
      { _id: user._id },
      { tokenVersion: user.tokenVersion },
    );
    // remove sensitive data
    const filterAccounts = user.accounts.map((account) => {
      const cache = account;
      delete cache.password;
      return cache;
    });
    // send access and refresh token (cookie)
    sendAccessToken(res, createAccessToken(user, '15m'), '15m');
    sendRefreshToken(res, createRefreshToken(user, '4h'), '4h', user.role);
    // end
    return res.send({
      success: true,
      user: {
        email: user.email,
        draws: user.draws,
        role: user.role,
        accounts: filterAccounts,
      },
    });
  } catch (error) {
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
    if (error.message === 'custom/INVALID_ROLE')
      return res.status(403).send({ success: false, message: '權限不足' });
    if (error.message === 'custom/ACCOUNT_HAS_BEEN_REVOKED')
      return res.status(403).send({ success: false, message: '帳號已註銷' });
    if (error.message === 'custom/TOKEN_HAS_BEEN_REVOKED')
      return res.status(403).send({ success: false, message: '令牌已註銷' });
    return res.status(500).send({ success: false, message: error.message });
  }
};
