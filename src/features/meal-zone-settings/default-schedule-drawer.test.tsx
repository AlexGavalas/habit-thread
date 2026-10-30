import { StrictMode, useState, type ReactElement } from 'react';

import { deferred } from '~test/meal-plan';
import { createQueryTestContext } from '~test/query';
import { act, renderWithUser, screen } from '~test/utils';

import { DefaultScheduleDrawer } from './default-schedule-drawer';

const ScheduleDrawerExample = (): ReactElement => {
    const [opened, setOpened] = useState(false);
    const handleOpen = (): void => {
        setOpened(true);
    };
    const handleClose = (): void => {
        setOpened(false);
    };
    return (
        <>
            <button type="button" onClick={handleOpen}>
                Open schedule
            </button>
            <DefaultScheduleDrawer opened={opened} onClose={handleClose} />
        </>
    );
};

describe('default schedule request lifecycle', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('makes one uncancelled request when opened in Strict Mode and none while closed', async () => {
        expect.hasAssertions();
        const pending = deferred<undefined>();
        const signals: (AbortSignal | null | undefined)[] = [];
        const fetch = jest
            .spyOn(global, 'fetch')
            .mockImplementation(async (_url, options) => {
                signals.push(options?.signal);
                await pending.promise;
                return Response.json({
                    effectiveFrom: '2026-01-19',
                    template: {
                        kind: 'daily',
                        slots: [
                            {
                                key: 'morning',
                                label: 'Breakfast',
                                time: '08:00',
                            },
                        ],
                    },
                });
            });
        const { client, Wrapper } = createQueryTestContext();
        const { user, unmount } = renderWithUser(
            <StrictMode>
                <ScheduleDrawerExample />
            </StrictMode>,
            { Wrapper },
        );
        expect(fetch).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Open schedule' }));
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(signals.map((signal) => signal?.aborted)).toStrictEqual([false]);
        await act(async () => {
            pending.resolve(undefined);
            await pending.promise;
        });
        await expect(
            screen.findByLabelText('Name for meal slot 1'),
        ).resolves.toHaveValue('Breakfast');
        expect(fetch).toHaveBeenCalledTimes(1);
        unmount();
        client.clear();
    });
});
