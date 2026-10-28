import { createQueryTestContext } from '~test/query';
import { renderWithUser, screen, within, waitFor } from '~test/utils';
import { type FoodSearchResult } from '~types/food-search';

import { FoodDatabaseTab } from './food-database';

jest.mock('~util/notification');

const oats: FoodSearchResult = {
    alternativeName: null,
    brand: null,
    id: 'shared-id',
    name: 'Oats',
    nutrition: {
        calories: 350,
        carbohydrates: 60,
        fat: 7,
        fiber: 10,
        protein: 13,
        salt: 0,
        sugar: 1,
    },
    quantity: null,
    source: 'bls',
};
const berries: FoodSearchResult = {
    ...oats,
    id: 'berries',
    name: 'Blueberries',
};
const branded: FoodSearchResult = {
    ...oats,
    name: 'Branded oats',
    source: 'open-food-facts',
};

const renderFoods = (): ReturnType<typeof renderWithUser> & {
    onDone: jest.Mock;
    cleanup: () => void;
} => {
    const { client, Wrapper } = createQueryTestContext();
    const onDone = jest.fn();
    const view = renderWithUser(<FoodDatabaseTab onDone={onDone} />, {
        Wrapper,
    });
    return {
        ...view,
        cleanup: () => {
            view.unmount();
            client.clear();
        },
        onDone,
    };
};

describe('food library basket', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('filters selected foods by provider and ID and restores removed results without refetching', async () => {
        expect.hasAssertions();
        const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
            Response.json({
                data: { bls: [oats, berries], openFoodFacts: [branded] },
                warnings: [],
            }),
        );
        const { user, cleanup } = renderFoods();
        const search = within(screen.getByRole('region', { name: 'Search' }));
        await user.type(search.getByLabelText('Food or brand'), 'oats');
        await user.click(search.getByRole('button', { name: 'Search' }));
        const results = within(
            await screen.findByRole('region', { name: 'Food search results' }),
        );
        await user.click(
            await results.findByRole('button', { name: /^Oats / }),
        );
        expect(results.getAllByRole('button')).toStrictEqual([
            results.getByRole('button', { name: /^Blueberries / }),
            results.getByRole('button', { name: /^Branded oats / }),
        ]);
        await user.click(
            results.getByRole('button', { name: /^Branded oats / }),
        );
        await user.click(
            results.getByRole('button', { name: /^Blueberries / }),
        );
        expect(
            results.getByText('All matching foods are already selected.'),
        ).toBeVisible();
        const basket = within(
            screen.getByRole('region', { name: 'Selected foods' }),
        );
        await user.click(basket.getByRole('button', { name: 'Remove Oats' }));
        expect(results.getAllByRole('button')).toStrictEqual([
            results.getByRole('button', { name: /^Oats / }),
        ]);
        await user.click(results.getByRole('button', { name: /^Oats / }));
        expect(
            results.getByText('All matching foods are already selected.'),
        ).toBeVisible();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        cleanup();
    });

    it('preserves quantities across searches and submits only the remaining foods', async () => {
        expect.hasAssertions();
        const fetchMock = jest
            .spyOn(global, 'fetch')
            .mockResolvedValueOnce(
                Response.json({
                    data: { bls: [oats], openFoodFacts: [] },
                    warnings: [],
                }),
            )
            .mockResolvedValueOnce(
                Response.json({
                    data: { bls: [berries], openFoodFacts: [] },
                    warnings: [],
                }),
            )
            .mockResolvedValueOnce(new Response(null, { status: 200 }));
        const { user, onDone, cleanup } = renderFoods();
        const search = within(screen.getByRole('region', { name: 'Search' }));
        const query = search.getByLabelText('Food or brand');
        await user.type(query, 'oats');
        await user.click(search.getByRole('button', { name: 'Search' }));
        await user.click(await screen.findByRole('button', { name: /^Oats / }));
        expect(screen.getByRole('status')).toHaveTextContent(
            'Added Oats to Selected foods (1).',
        );
        const quantity = screen.getByRole('textbox', {
            name: 'Quantity for Oats',
        });
        await user.clear(quantity);
        await user.type(quantity, '150');
        await user.clear(query);
        await user.type(query, 'berries');
        await user.click(search.getByRole('button', { name: 'Search' }));
        await user.click(
            await screen.findByRole('button', { name: /^Blueberries / }),
        );
        expect(quantity).toHaveValue('150 g');
        expect(screen.getByText(/875 kcal/)).toBeVisible();
        await user.click(
            screen.getByRole('button', { name: 'Remove Blueberries' }),
        );
        await user.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => {
            expect(onDone).toHaveBeenCalledTimes(1);
        });
        expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/pool/meal', {
            body: JSON.stringify({
                templates: [
                    {
                        content: 'Oats',
                        items: [
                            {
                                alternative_name: null,
                                basis_grams: 100,
                                brand: null,
                                ...oats.nutrition,
                                name: 'Oats',
                                position: 0,
                                provider_food_id: 'shared-id',
                                quantity_grams: 150,
                                source: 'bls',
                            },
                        ],
                    },
                ],
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        });
        cleanup();
    });
});
