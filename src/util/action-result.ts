import {
    type ActionFailureReason,
    type ActionResult,
} from '~types/action-result';

export class ActionFailure extends Error {
    constructor(readonly reason: ActionFailureReason) {
        super(`Action failed: ${reason}`);
        this.name = 'ActionFailure';
    }
}

export const requireActionSuccess = <Data extends object>(
    result: ActionResult<Data>,
): { ok: true } & Data => {
    if (!result.ok) {
        throw new ActionFailure(result.reason);
    }
    return result;
};
