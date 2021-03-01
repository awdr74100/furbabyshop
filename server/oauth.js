import express from 'express';
import { google } from 'googleapis';
import { stringify } from 'qs';
import User from './models/User';
import { createAccessToken, createRefreshToken } from './utils/createToken';
import { sendAccessToken, sendRefreshToken } from './utils/sendToken';

const app = express();

/* Google Config */
const GoogleOAuthClient = new google.auth.OAuth2(
  process.env.GCP_CLIENT_ID,
  process.env.GCP_CLIENT_SECRET,
  `${process.env.BASE_URL}/oauth/google/callback`,
);
google.options({ auth: GoogleOAuthClient });

/* Google OAuth */
app.get('/google', (req, res) => {
  const { referer } = req.headers;
  if (!referer) return res.redirect('/');
  const url = GoogleOAuthClient.generateAuthUrl({
    scope: 'email profile',
    state: referer,
  });
  // redirect url
  return res.redirect(url);
});

/* Google OAuth Redirect */
app.get('/google/callback', async (req, res) => {
  const { state, code } = req.query;
  if (!state || !code) return res.redirect('/');
  const referer = state.includes('?') ? `${state}&` : `${state}?`;
  try {
    // exchange authorization code for tokens
    const { tokens } = await GoogleOAuthClient.getToken(code);
    // setCredentials
    GoogleOAuthClient.setCredentials(tokens);
    // get profile
    const { data } = await google.oauth2('v2').userinfo.get();
    const { id, email, name, picture } = data;
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
    // remove sensitive data
    const filterAccounts = user.accounts.map((account) => {
      const cache = account;
      delete cache.password;
      return cache;
    });
    // send access and refresh token (cookie)
    sendAccessToken(res, createAccessToken(user, '15m'), '15m');
    sendRefreshToken(res, createRefreshToken(user, '4h'), '4h', user.role);
    // redirect url
    return res.redirect(
      `${
        referer +
        stringify({
          email: user.email,
          photoUrl: user.photoUrl,
          draws: user.draws,
          role: user.role,
          accounts: filterAccounts,
        })
      }`,
    );
  } catch (error) {
    return res.status(400).send({ success: false, message: error.message });
  }
});

export default app;
