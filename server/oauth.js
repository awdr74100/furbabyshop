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
    const oauth2 = google.oauth2('v2');
    const { data } = await oauth2.userinfo.get({ auth: GoogleOAuthClient });
    const { id, email, name, picture } = data;
    // set oauth provider
    const provider = {
      kind: 'google',
      uid: id,
      photo: picture,
      displayName: name,
    };
    // find user
    let user = await User.findOne({ email });
    // save user
    if (!user) {
      user = await new User({
        email,
        draws: 3,
        role: 'user',
        tokenVersion: 0,
        accounts: [provider],
      }).save();
    }
    // connect user
    if (!user.toJSON().accounts.find(({ kind }) => kind === 'google')) {
      const accounts = [...user.toJSON().accounts, provider];
      await User.updateOne({ _id: user.id }, { accounts });
      user.accounts = accounts;
    }
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
