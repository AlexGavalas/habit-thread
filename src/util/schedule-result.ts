import { type ActionResult } from '~types/action-result';
import { requireActionSuccess } from '~util/action-result';

export class ScheduleConflictError extends Error {
    constructor(readonly days: string[]) {
        super('Schedule change would detach planned meals');
        this.name = 'ScheduleConflictError';
    }
}

export type ScheduleActionResult<Data extends object = { ok: true }> =
    | ActionResult<Data>
    | { ok: false; reason: 'schedule_conflict'; days: string[] };

export const requireScheduleSuccess = <Data extends object>(
    result: ScheduleActionResult<Data>,
): { ok: true } & Data => {
    if (!result.ok && result.reason === 'schedule_conflict') {
        throw new ScheduleConflictError(result.days);
    }
    return requireActionSuccess(result);
};
