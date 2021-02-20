import express from 'express';
import { google } from 'googleapis';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { stringify } from 'qs';
import User from './models/User';
import {
  generateAccessToken,
  generateRefreshToken,
} from './utils/generateToken';
import { sendAccessToken, sendRefreshToken } from './utils/sendToken';

const app = express();

/* Redirect OAuth Server */
app.get('/', (req, res) => {
  const { referer } = req.headers;
  const { provider } = req.query;
  // google oauth
  if (provider === 'google') {
    const oauthClient = new google.auth.OAuth2(
      process.env.GCP_CLIENT_ID,
      process.env.GCP_CLIENT_SECRET,
      `${process.env.BASE_URL}/oauth/google`,
    );
    const url = oauthClient.generateAuthUrl({
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
  const oauthClient = new google.auth.OAuth2(
    process.env.GCP_CLIENT_ID,
    process.env.GCP_CLIENT_SECRET,
    `${process.env.BASE_URL}/oauth/google`,
  );
  try {
    // exchange authorization code for tokens
    const { tokens } = await oauthClient.getToken(code);
    // setCredentials
    oauthClient.setCredentials(tokens);
    // get info
    const oauth2 = google.oauth2('v2');
    const { data } = await oauth2.userinfo.get({ auth: oauthClient });
    const { id, email, name, picture } = data;
    // find user
    let user = await User.findOne({ email });
    // save user
    if (!user) {
      const random = randomBytes(7).toString('hex');
      const hashPassword = await argon2.hash(random, { type: argon2.argon2id });
      user = await new User({
        displayName: name,
        username: id,
        email,
        password: hashPassword,
        photoUrl: picture,
        draws: 3,
        role: 'user',
        tokenVersion: 0,
        oauthProviders: ['google'],
      }).save();
    }
    // update user
    if (!user.oauthProviders.includes('google')) {
      await User.updateOne(
        { _id: user.id },
        {
          displayName: name,
          photoUrl: picture,
          oauthProviders: [...user.oauthProviders, 'google'],
        },
      );
      user.displayName = name;
      user.photoUrl = picture;
      user.oauthProviders = [...user.oauthProviders, 'google'];
    }
    // send tokens (access, refresh)
    sendAccessToken(res, generateAccessToken(user, '15m'));
    sendRefreshToken(res, generateRefreshToken(user, '4h'), user.role);
    // end
    return res.redirect(
      `${state}?${stringify({
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        photoUrl: user.photoUrl,
        role: user.role,
      })}`,
    );
  } catch (error) {
    return res.status(400).send({ success: false, message: error.message });
  }
});

export default app;
