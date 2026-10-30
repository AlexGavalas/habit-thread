import { deferred } from '~test/meal-plan';
import { createQueryTestContext } from '~test/query';
import { act, renderWithUser, screen, waitFor } from '~test/utils';
import { type ScheduleActionResult } from '~util/schedule-result';

import { saveDefaultSchedule } from '../../app/schedule-actions';
import { MealZoneSettings as ScheduleFields } from './meal-zone-settings';
import { useDefaultSchedule } from './use-default-schedule';

const MealZoneSettings = ({
    ownerUserId,
    onClose,
}: Readonly<{
    ownerUserId?: number;
    onClose?: () => void;
}>): ReactElement => {
    const schedule = useDefaultSchedule(ownerUserId);
    return <ScheduleFields schedule={schedule} onClose={onClose} />;
};

const response = {
    effectiveFrom: '2026-01-19',
    template: {
        kind: 'daily',
        slots: [
            { key: 'morning', label: 'Breakfast', time: '08:00' },
            { key: 'lunch', label: 'Lunch', time: '13:00' },
        ],
    },
};

describe('default schedule settings', () => {
    beforeEach(() => {
        jest.spyOn(global, 'fetch').mockResolvedValue(Response.json(response));
        jest.mocked(saveDefaultSchedule).mockResolvedValue({ ok: true });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('edits names and native time values while retaining slot identities', async () => {
        expect.hasAssertions();
        const { client, Wrapper } = createQueryTestContext();
        const { user, unmount } = renderWithUser(
            <MealZoneSettings ownerUserId={7} />,
            { Wrapper },
        );
        const name = await screen.findByLabelText('Name for meal slot 1');
        await user.clear(name);
        await user.type(name, 'Early breakfast');
        const time = screen.getByLabelText('Time for meal slot 1');
        await user.clear(time);
        await user.type(time, '07:30');
        await user.click(
            screen.getByRole('button', { name: 'Save from 19/01/2026' }),
        );
        await waitFor(() => {
            expect(saveDefaultSchedule).toHaveBeenCalledWith({
                effectiveFrom: '2026-01-19',
                ownerUserId: 7,
                template: {
                    kind: 'daily',
                    slots: [
                        {
                            key: 'morning',
                            label: 'Early breakfast',
                            time: '07:30',
                        },
                        response.template.slots[1],
                    ],
                },
            });
        });
        unmount();
        client.clear();
    });

    it('retains the draft and explains occupied-slot conflicts', async () => {
        expect.hasAssertions();
        const onClose = jest.fn();
        jest.mocked(saveDefaultSchedule).mockResolvedValue({
            days: ['2026-01-20'],
            ok: false,
            reason: 'schedule_conflict',
        });
        const { client, Wrapper } = createQueryTestContext();
        const { user, unmount } = renderWithUser(
            <MealZoneSettings onClose={onClose} />,
            {
                Wrapper,
            },
        );
        const name = await screen.findByLabelText('Name for meal slot 1');
        await user.clear(name);
        await user.type(name, 'My breakfast');
        await user.click(
            screen.getByRole('button', { name: 'Save from 19/01/2026' }),
        );
        await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
            '2026-01-20',
        );
        expect(name).toHaveValue('My breakfast');
        expect(onClose).not.toHaveBeenCalled();
        unmount();
        client.clear();
    });

    it('closes only after success and disables editing while saving', async () => {
        expect.hasAssertions();
        const pending = deferred<ScheduleActionResult>();
        jest.mocked(saveDefaultSchedule).mockReturnValue(pending.promise);
        const { client, Wrapper } = createQueryTestContext();
        const onClose = jest.fn();
        const { user, unmount } = renderWithUser(
            <MealZoneSettings onClose={onClose} />,
            { Wrapper },
        );
        const name = await screen.findByLabelText('Name for meal slot 1');
        await user.click(
            screen.getByRole('button', { name: 'Save from 19/01/2026' }),
        );
        expect(name).toBeDisabled();
        expect(onClose).not.toHaveBeenCalled();
        await act(async () => {
            pending.resolve({ ok: true });
            await pending.promise;
        });
        await waitFor(() => {
            expect(onClose).toHaveBeenCalledTimes(1);
        });
        unmount();
        client.clear();
    });

    it('does not replace an unsaved draft on refetch', async () => {
        expect.hasAssertions();
        const { client, Wrapper } = createQueryTestContext();
        const { user, unmount } = renderWithUser(<MealZoneSettings />, {
            Wrapper,
        });
        const name = await screen.findByLabelText('Name for meal slot 1');
        await user.clear(name);
        await user.type(name, 'Unsaved');
        await act(async () => {
            await client.invalidateQueries({ queryKey: ['schedule-template'] });
        });
        expect(name).toHaveValue('Unsaved');
        unmount();
        client.clear();
    });

    it('offers retry instead of editing defaults after a failed read', async () => {
        expect.hasAssertions();
        jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(null, { status: 500 }),
        );
        const { client, Wrapper } = createQueryTestContext();
        const { user, unmount } = renderWithUser(<MealZoneSettings />, {
            Wrapper,
        });
        await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
            'We could not load your data.',
        );
        expect(
            screen.queryByLabelText('Name for meal slot 1'),
        ).not.toBeInTheDocument();
        jest.spyOn(global, 'fetch').mockResolvedValue(Response.json(response));
        await user.click(
            screen.getByRole('button', { name: 'Please try again' }),
        );
        await expect(
            screen.findByLabelText('Name for meal slot 1'),
        ).resolves.toHaveValue('Breakfast');
        unmount();
        client.clear();
    });
});
import { type ReactElement } from 'react';
