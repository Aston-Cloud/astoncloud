export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Yêu cầu không hợp lệ', details?: unknown) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Chưa xác thực hoặc phiên đăng nhập đã hết hạn', details?: unknown) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này', details?: unknown) {
    super(message, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên yêu cầu', details?: unknown) {
    super(message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Tài nguyên đã tồn tại hoặc xảy ra xung đột dữ liệu', details?: unknown) {
    super(message, 409, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Đã xảy ra lỗi nội bộ hệ thống', details?: unknown) {
    super(message, 500, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Dịch vụ tạm thời không khả dụng', details?: unknown) {
    super(message, 503, details);
  }
}
