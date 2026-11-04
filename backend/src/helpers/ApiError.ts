class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg: string) { return new ApiError(400, msg); }
  static unauthorized(msg = 'Chưa đăng nhập') { return new ApiError(401, msg); }
  static forbidden(msg = 'Không có quyền') { return new ApiError(403, msg); }
  static notFound(msg = 'Không tìm thấy') { return new ApiError(404, msg); }
  static internal(msg = 'Lỗi server') { return new ApiError(500, msg); }
}

export default ApiError;
