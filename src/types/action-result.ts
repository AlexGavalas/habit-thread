export type ActionFailureReason = 'unauthorized' | 'invalid' | 'forbidden';

export type ActionResult<Data extends object = { ok: true }> =
    | ({ ok: true } & Data)
    | { ok: false; reason: ActionFailureReason };
