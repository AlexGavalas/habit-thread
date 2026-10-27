import { useModals } from '@mantine/modals';
import type { ReactElement } from 'react';

import { ContextModalsProvider } from '~features/context-modals';
import { FeatureFlagsProvider } from '~features/feature-flags';
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

const renderMealPool = (
    isMealImportEnabled: boolean,
): ReturnType<typeof renderWithUser> =>
    renderWithUser(
        <FeatureFlagsProvider
            value={{ isFoodDatabaseSearchEnabled: false, isMealImportEnabled }}
        >
            <ContextModalsProvider>
                <TestMealPool />
            </ContextModalsProvider>
        </FeatureFlagsProvider>,
    );

describe('meal import feature flag', () => {
    it('does not render the import tab or its content when disabled', () => {
        renderMealPool(false);
        expect(
            screen.queryByRole('tab', { name: 'Import files' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByTestId('file-import')).not.toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Manual' })).toBeVisible();
    });

    it('allows selecting the import tab when enabled', async () => {
        expect.hasAssertions();
        const { user } = renderMealPool(true);
        await user.click(screen.getByRole('tab', { name: 'Import files' }));
        expect(screen.getByTestId('file-import')).toBeVisible();
        expect(
            screen.queryByRole('tab', { name: 'Food database' }),
        ).not.toBeInTheDocument();
    });
});
