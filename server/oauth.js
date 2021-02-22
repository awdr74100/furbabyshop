import express from 'express';
import { google } from 'googleapis';
import { stringify } from 'qs';
import User from './models/User';
import {
  generateAccessToken,
  generateRefreshToken,
} from './utils/generateToken';
import { sendAccessToken, sendRefreshToken } from './utils/sendToken';

const app = express();

/* Google OAuth Config */
const GoogleOAuthClient = new google.auth.OAuth2(
  process.env.GCP_CLIENT_ID,
  process.env.GCP_CLIENT_SECRET,
  `${process.env.BASE_URL}/oauth/google`,
);

/* Redirect OAuth Server */
app.get('/', (req, res) => {
  const { referer } = req.headers;
  const { provider } = req.query;
  // google oauth
  if (provider === 'google') {
    const url = GoogleOAuthClient.generateAuthUrl({
      scope: 'email profile',
      state: referer || process.env.BASE_URL,
    });
    return res.redirect(url);
  }
  return res.redirect('/');
});

/* Google OAuth */
app.get('/google', async (req, res) => {
  const { state, code } = req.query;
  if (!state || !code) return res.sendStatus(401);
  try {
    // exchange authorization code for tokens
    const { tokens } = await GoogleOAuthClient.getToken(code);
    // setCredentials (access token)
    GoogleOAuthClient.setCredentials(tokens);
    // get info
    const {
      data: { id, email, name, picture },
    } = await google.oauth2('v2').userinfo.get({ auth: GoogleOAuthClient });
    // set provider
    const googleProvider = {
      kind: 'google',
      uid: id,
      photo: picture,
      displayName: name,
    };
    // find user
    let user = await User.findOne({ email }).lean();
    // save user
    if (!user) {
      const newUser = await new User({
        email,
        draws: 3,
        role: 'user',
        tokenVersion: 0,
        accounts: [googleProvider],
      }).save();
      user = newUser.toObject();
    }
    // find account
    const googleAccount = user.accounts.find(({ kind }) => kind === 'google');
    // connect account
    if (!googleAccount) {
      await User.updateOne(
        { _id: user._id },
        { accounts: [...user.accounts, googleProvider] },
      );
      user.accounts = [...user.accounts, googleProvider];
    }
    // send tokens (access, refresh)
    sendAccessToken(res, generateAccessToken(user, '15m'));
    sendRefreshToken(res, generateRefreshToken(user, '4h'), user.role);
    // remove sensitive data
    const filterAccounts = user.accounts.map((account) => {
      const cache = account;
      delete cache.password;
      return cache;
    });
    // end
    return res.redirect(
      `${state}?${stringify({
        email: user.email,
        photoUrl: user.photoUrl,
        draws: user.draws,
        role: user.role,
        accounts: filterAccounts,
      })}`,
    );
  } catch (error) {
    return res.status(400).send({ success: false, message: error.message });
  }
});

export default app;
