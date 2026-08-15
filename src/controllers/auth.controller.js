const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

const COOKIE = 'refreshToken';

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.cookie(COOKIE, result.refreshToken, result.cookieOptions);
  res.status(201).json({success: true,data: {user: result.user,accessToken: result.accessToken,},});
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.cookie(COOKIE, result.refreshToken, result.cookieOptions);
  res.json({success: true,data: {user: result.user,accessToken: result.accessToken,},});});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.cookies?.[COOKIE]);
  res.cookie(COOKIE, result.refreshToken, result.cookieOptions);
  res.json({ success: true, data: {  user: result.user,   accessToken: result.accessToken, },});
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ success: true, message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  res.json({ success: true, data: user });
});

module.exports = { register, login, refresh, logout, me };