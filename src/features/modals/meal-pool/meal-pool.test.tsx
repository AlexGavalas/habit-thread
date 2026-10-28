import { useModals } from '@mantine/modals';
import type { ReactElement } from 'react';

import { ContextModalsProvider } from '~features/context-modals';
import { renderWithUser, screen } from '~test/utils';

import { MealPoolModal } from './meal-pool';

jest.mock('./file-upload', () => ({
    FileUploadTab: (): ReactElement => <div data-testid="file-import" />,
}));
jest.mock('./manual-input', () => ({
    ManualInputTab: (): ReactElement => <div data-testid="manual-input" />,
}));
jest.mock('./food-database', () => ({
    FoodDatabaseTab: (): ReactElement => <div data-testid="food-database" />,
}));

const TestMealPool = (): ReactElement => {
    const context = useModals();
    return <MealPoolModal context={context} id="test" innerProps={{}} />;
};

const renderMealPool = (): ReturnType<typeof renderWithUser> =>
    renderWithUser(
        <ContextModalsProvider>
            <TestMealPool />
        </ContextModalsProvider>,
    );

describe('meal library sources', () => {
    it('offers manual entry, food database search and file import by default', () => {
        renderMealPool();
        expect(screen.getByRole('tab', { name: 'Manual' })).toBeVisible();
        expect(
            screen.getByRole('tab', { name: 'Food database' }),
        ).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Import files' })).toBeVisible();
    });

    it.each(['Import files', 'Food database'])(
        'allows selecting %s',
        async (name) => {
            expect.hasAssertions();
            const { user } = renderMealPool();
            await user.click(screen.getByRole('tab', { name }));
            expect(screen.getByRole('tabpanel', { name })).toBeVisible();
        },
    );
});
