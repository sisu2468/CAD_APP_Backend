const authService = require('../services/authService');
const { success } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

const login = catchAsync(async (req, res) => {
  const { email, pwd } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, pwd);

  res
    .cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: req.app.get('env') === 'production',
      sameSite: 'strict',
      path: '/api/token/refresh',
    })
    .json(
      success({
        token: accessToken,
        user,
        message: 'user_login_succeeded',
      })
    );
});

const register = catchAsync(async (req, res) => {
  await authService.register(req.body);
  res.json(
    success({
      message: 'user_registration_succeeded',
    })
  );
});

const loginWithToken = catchAsync(async (req, res) => {
  res.json(
    success({
      user: req.user,
    })
  );
});

const updateProfile = catchAsync(async (req, res) => {
  await authService.updateProfile(req.user.sub, req.body);
  res.json(
    success({
      message: 'user_profile_updated',
    })
  );
});

const refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  const { accessToken } = await authService.refreshAccessToken(token);
  res.json(
    success({
      token: accessToken,
    })
  );
});

module.exports = {
  login,
  register,
  loginWithToken,
  updateProfile,
  refreshToken,
};

