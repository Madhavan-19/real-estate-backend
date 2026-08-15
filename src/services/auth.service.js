const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../model/user.model');
const ApiError = require('../utils/ApiError');
const {signAccessToken,signRefreshToken,hashToken,verifyRefreshToken} = require('../utils/token.util');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const saveRefreshToken = async (userId, token) => {
  const { exp } = jwt.decode(token);

  const { query } = require('../config/db');

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(token), new Date(exp * 1000)]
  );
};

const register = async ({ name, email, password, phone }) => {
  const existing = await userModel.findByEmail(email);

  if (existing)
    throw new ApiError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    name,
    email,
    passwordHash,
    phone,
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await saveRefreshToken(user.id, refreshToken);

  return { user, accessToken, refreshToken, cookieOptions };
};

const login = async ({ email, password }) => {
  const user = await userModel.findByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    throw new ApiError(401, 'Invalid email or password');

  delete user.password_hash;

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await saveRefreshToken(user.id, refreshToken);

  return { user, accessToken, refreshToken, cookieOptions };
};

const me = async (id) => {
  const user = await userModel.findById(id);

  if (!user) throw new ApiError(404, 'User not found');

  return user;
};

const refresh = async (token) => {
  if (!token)
    throw new ApiError(401, 'No refresh token provided');

  try {
    const payload = verifyRefreshToken(token);
    const user = await userModel.findById(payload.sub);

    if (!user)
      throw new ApiError(401, 'User no longer exists');

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return { user, accessToken, refreshToken, cookieOptions };
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
};

const logout = async () => {
  return true;
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
};