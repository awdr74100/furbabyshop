import ms from 'ms';

export const sendAccessToken = (res, accessToken, maxAge) => {
  return res.cookie('accessToken', accessToken, {
    httpOnly: true,
    maxAge: ms(maxAge),
    sameSite: 'strict',
    secure: !!process.env.ON_VERCEL,
    path: '/',
  });
};

export const sendRefreshToken = (res, refreshToken, maxAge, role) => {
  return res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    maxAge: ms(maxAge),
    sameSite: 'strict',
    secure: !!process.env.ON_VERCEL,
    path: `/api/${role}/refresh_token`,
  });
};
