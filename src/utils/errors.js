export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Girdi doğrulama hatası', details = null) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Oturum açmanız gerekmektedir', details = null) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz bulunmamaktadır', details = null) {
    super(message, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'İstenen kaynak bulunamadı', details = null) {
    super(message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Kaynak çakışması', details = null) {
    super(message, 409, details);
  }
}

export class LockedError extends AppError {
  constructor(message = 'Çok fazla başarısız deneme nedeniyle hesabınız geçici olarak kilitlendi', details = null) {
    super(message, 423, details);
  }
}
