import ms from 'ms';

export const sendAccessToken = (res, accessToken, maxAge) => {
  return res.cookie('accessToken', accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: ms(maxAge),
    secure: !!process.env.ON_CLOUD_SERVER,
    path: '/',
  });
};

export const sendRefreshToken = (res, refreshToken, maxAge, role) => {
  return res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: ms(maxAge),
    secure: !!process.env.ON_CLOUD_SERVER,
    path: `/api/${role}/refresh_token`,
  });
};
