import express from 'express';
import mongoose from 'mongoose';
import { google } from 'googleapis';
import User from './models/User';

const app = express();

mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

const googleOAuthClient = new google.auth.OAuth2(
  process.env.GCP_CLIENT_ID,
  process.env.GCP_CLIENT_SECRET,
  `${process.env.BASE_URL}/oauth/google`,
);

/* Redirect OAuth Server */
app.get('/', (req, res) => {
  const { referer } = req.headers;
  const { provider } = req.query;
  // set redirect url;
  let url = referer || '/';
  // google oauth
  if (provider === 'google' && referer) {
    url = googleOAuthClient.generateAuthUrl({
      scope: 'email profile',
      state: referer,
    });
  }
  return res.redirect(url);
});

/* Google OAuth */
app.get('/google', async (req, res) => {
  const { state, code } = req.query;
  if (!state || !code) return res.sendStatus(401);
  try {
    // exchange authorization code for tokens
    const { tokens } = await googleOAuthClient.getToken(code);
    // setCredentials
    googleOAuthClient.setCredentials(tokens);
    // get user info
    const oauth2 = google.oauth2('v2');
    const { data } = await oauth2.userinfo.get({ auth: googleOAuthClient });
    const { id, email, name, picture } = data;
    // find user
    let user = await User.findOne({ email });
    // save or update user
    if (!user) {
      user = new User({
        displayName: name,
        username: id,
        email,
        password: 'empty',
        photoUrl: picture,
        draws: 3,
        role: 'user',
        tokenVersion: 0,
        providers: ['google'],
      });
    } else if (!user.providers.includes('google')) {
      await User.updateOne(
        { _id: user.id },
        {
          displayName: name,
          photoUrl: picture,
          providers: [...user.providers, 'google'],
        },
      );
    }
    return res.redirect(state);
  } catch (error) {
    return res.redirect('/');
  }
});

export default app;
