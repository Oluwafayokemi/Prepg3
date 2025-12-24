"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmail = validateEmail;
exports.validateRequired = validateRequired;
exports.validatePositiveNumber = validatePositiveNumber;
exports.validatePercentage = validatePercentage;
// lambda/shared/utils/validators.ts
const errors_1 = require("./errors");
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new errors_1.ValidationError('Invalid email format');
    }
}
function validateRequired(value, fieldName) {
    if (value === undefined || value === null || value === '') {
        throw new errors_1.ValidationError(`${fieldName} is required`);
    }
}
function validatePositiveNumber(value, fieldName) {
    if (typeof value !== 'number' || value <= 0) {
        throw new errors_1.ValidationError(`${fieldName} must be a positive number`);
    }
}
function validatePercentage(value, fieldName) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new errors_1.ValidationError(`${fieldName} must be between 0 and 100`);
    }
}
//# sourceMappingURL=validators.js.map