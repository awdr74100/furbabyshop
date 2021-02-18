import { sign } from 'jsonwebtoken';

export const generateAccessToken = (payload, expiresIn) => {
  return sign(
    {
      id: payload.id,
      role: payload.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn },
  );
};

export const generateRefreshToken = (payload, expiresIn) => {
  return sign(
    {
      id: payload.id,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn },
  );
};
