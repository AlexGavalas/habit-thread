import { deferred } from '~test/meal-plan';
import { renderWithUser, screen, waitFor } from '~test/utils';
import { type WeeklyMealZone } from '~types/meal-zone';

import { ScheduleEditor } from './schedule-editor';

const zones: WeeklyMealZone[] = [
    {
        day: '2026-01-14',
        label: 'Breakfast',
        position: 0,
        time: '08:00',
        weekStart: '2026-01-12',
        zoneKey: 'breakfast',
    },
    {
        day: '2026-01-14',
        label: 'Lunch',
        position: 1,
        time: '13:00',
        weekStart: '2026-01-12',
        zoneKey: 'lunch',
    },
    {
        day: '2026-01-15',
        label: 'Thursday breakfast',
        position: 0,
        time: '09:00',
        weekStart: '2026-01-12',
        zoneKey: 'thursday',
    },
];

describe('date-specific schedule editor', () => {
    it('submits only the selected date and preserves its meal slot keys', async () => {
        expect.hasAssertions();
        const onSave = jest.fn().mockResolvedValue(undefined);
        const onClose = jest.fn();
        const { user } = renderWithUser(
            <ScheduleEditor
                initialDay="2026-01-14"
                isSaving={false}
                meals={[]}
                onClose={onClose}
                onSave={onSave}
                weekStart="2026-01-12"
                zones={zones}
            />,
        );
        const name = screen.getByLabelText('Name for meal slot 1');
        await user.clear(name);
        await user.type(name, 'Late breakfast');
        await user.click(screen.getByRole('button', { name: 'Save this day' }));
        await waitFor(() => {
            expect(onClose).toHaveBeenCalledTimes(1);
        });
        expect(onSave).toHaveBeenCalledWith('2026-01-14', [
            { ...zones[0], label: 'Late breakfast' },
            zones[1],
        ]);
    });

    it('retains failed edits and closes only after a successful retry', async () => {
        expect.hasAssertions();
        const onSave = jest
            .fn()
            .mockRejectedValueOnce(new Error('Offline'))
            .mockResolvedValueOnce(undefined);
        const onClose = jest.fn();
        const { user } = renderWithUser(
            <ScheduleEditor
                initialDay="2026-01-14"
                isSaving={false}
                meals={[]}
                onClose={onClose}
                onSave={onSave}
                weekStart="2026-01-12"
                zones={zones}
            />,
        );
        const name = screen.getByLabelText('Name for meal slot 1');
        await user.clear(name);
        await user.type(name, 'My breakfast');
        await user.click(screen.getByRole('button', { name: 'Save this day' }));
        await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
            'We could not save the schedule',
        );
        expect(name).toHaveValue('My breakfast');
        expect(onClose).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Save this day' }));
        await waitFor(() => {
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    it('resets an override by removing it rather than saving a default snapshot', async () => {
        expect.hasAssertions();
        const onSave = jest.fn().mockResolvedValue(undefined);
        const onClose = jest.fn();
        const { user } = renderWithUser(
            <ScheduleEditor
                initialDay="2026-01-14"
                isSaving={false}
                meals={[]}
                onClose={onClose}
                onSave={onSave}
                weekStart="2026-01-12"
                zones={zones.map((zone) => ({ ...zone, isOverride: true }))}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Use default schedule' }),
        );
        expect(onSave).toHaveBeenCalledWith('2026-01-14', null);
    });

    it('does not close a newly mounted editor when an old save finishes', async () => {
        expect.hasAssertions();
        const pending = deferred<undefined>();
        const onClose = jest.fn();
        const onSave = (): Promise<void> => pending.promise;
        const onNextSave = jest.fn();
        const { user, rerender } = renderWithUser(
            <ScheduleEditor
                key="old"
                initialDay="2026-01-14"
                isSaving={false}
                meals={[]}
                onClose={onClose}
                onSave={onSave}
                weekStart="2026-01-12"
                zones={zones}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Save this day' }));
        rerender(
            <ScheduleEditor
                key="new"
                initialDay="2026-01-15"
                isSaving={false}
                meals={[]}
                onClose={onClose}
                onSave={onNextSave}
                weekStart="2026-01-12"
                zones={zones}
            />,
        );
        pending.resolve(undefined);
        await waitFor(() => {
            expect(screen.getByLabelText('Name for meal slot 1')).toHaveValue(
                'Thursday breakfast',
            );
        });
        expect(onClose).not.toHaveBeenCalled();
    });
});
