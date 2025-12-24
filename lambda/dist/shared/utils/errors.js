"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
exports.handleError = handleError;
// lambda/shared/utils/errors.ts
class AppError extends Error {
    statusCode;
    message;
    code;
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(400, message, 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource) {
        super(404, `${resource} not found`, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(403, message, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
function handleError(error) {
    if (error instanceof AppError) {
        return {
            statusCode: error.statusCode,
            body: JSON.stringify({
                error: error.message,
                code: error.code,
            }),
        };
    }
    console.error('Unexpected error:', error);
    return {
        statusCode: 500,
        body: JSON.stringify({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
        }),
    };
}
//# sourceMappingURL=errors.js.map