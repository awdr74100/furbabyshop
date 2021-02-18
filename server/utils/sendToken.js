import ms from 'ms';

export const sendAccessToken = (res, accessToken) => {
  return res.cookie('accessToken', accessToken, {
    httpOnly: true,
    maxAge: ms('15m'),
    sameSite: 'strict',
    secure: !!process.env.ON_VERCEL,
    path: '/',
  });
};

export const sendRefreshToken = (res, refreshToken, role) => {
  return res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    maxAge: ms('4h'),
    sameSite: 'strict',
    secure: !!process.env.ON_VERCEL,
    path: `/api/${role}/refresh_token`,
  });
};

export const sendClearTokens = (res, role) => {
  return res
    .clearCookie('accessToken', {
      sameSite: 'strict',
      path: '/',
    })
    .clearCookie('refreshToken', {
      sameSite: 'strict',
      path: `/api/${role}/refresh_token`,
    });
};
