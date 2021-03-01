import { sign } from 'jsonwebtoken';

export const createAccessToken = (payload, expiresIn) => {
  return sign(
    {
      id: payload.id || payload._id.toString(),
      role: payload.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn },
  );
};

export const createRefreshToken = (payload, expiresIn) => {
  return sign(
    {
      id: payload.id || payload._id.toString(),
      role: payload.role,
      tokenVersion: payload.tokenVersion,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn },
  );
};
