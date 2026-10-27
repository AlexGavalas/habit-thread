import type { MealImportErrorCode } from '~schemas/meal-import';

export class MealImportError extends Error {
    readonly code: MealImportErrorCode;

    constructor(code: MealImportErrorCode) {
        super(code);
        this.name = 'MealImportError';
        this.code = code;
    }
}
