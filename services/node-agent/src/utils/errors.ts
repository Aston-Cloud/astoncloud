export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'InternalServerError', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Xác thực Machine-to-Machine không hợp lệ hoặc thiếu thông tin ủy quyền') {
    super(message, 401, 'Unauthorized');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Thao tác bị từ chối do chính sách bảo mật') {
    super(message, 403, 'Forbidden');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Tài nguyên container không tồn tại') {
    super(message, 404, 'NotFound');
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Dữ liệu yêu cầu không hợp lệ', details?: any) {
    super(message, 400, 'ValidationError', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Xung đột định danh hoặc trạng thái container') {
    super(message, 409, 'Conflict');
  }
}

export class DockerOperationError extends AppError {
  constructor(message: string = 'Lỗi tương tác với Docker Engine', details?: any) {
    super(message, 500, 'DockerOperationError', details);
  }
}
