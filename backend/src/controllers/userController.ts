import ApiError from '../helpers/ApiError';
import catchAsync from '../helpers/catchAsync';
import * as userService from '../services/userService';

export const registerUser = catchAsync(async (req, res) => {
  const result = await userService.registerUser(req.body);
  res.status(201).json(result);
});

export const loginUser = catchAsync(async (req, res) => {
  const result = await userService.loginUser(req.body);
  res.json(result);
});

export const getUserProfile = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();
  const user = await userService.getUserProfile(userId);
  res.json(user);
});

export const updateUserProfile = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();
  const user = await userService.updateUserProfile(userId, req.body);
  res.json(user);
});

// ✅ NEW: Đổi mật khẩu
export const changePassword = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();
  const result = await userService.changePassword(userId, req.body);
  res.json(result);
});


// POST /api/users/logout — thu hồi refresh session phía server trước khi xóa token ở trình duyệt.
export const logoutUser = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();
  await userService.logoutUser(userId);
  res.json({ message: 'Đăng xuất thành công' });
});
