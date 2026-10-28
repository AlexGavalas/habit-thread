import { within } from '@testing-library/react';

import { renderWithUser, screen } from '~test/utils';
import { type EditedMeal } from '~types/meal';

import { NutritionSummary } from './nutrition-summary';

const meal: EditedMeal = {
    day: '2026-01-12',
    items: [
        {
            calories: 100,
            carbohydrates: 10,
            fat: 2,
            fiber: 1,
            name: 'Oats',
            position: 0,
            protein: 5,
            provider_food_id: 'oats',
            quantity_grams: 100,
            salt: 0,
            source: 'bls',
            sugar: 1,
        },
    ],
    meal: 'Oats',
    section_key: 'breakfast',
    user_id: 7,
};

describe('nutrition summary accessibility', () => {
    it('names each macro progress bar within its distribution group', () => {
        renderWithUser(<NutritionSummary meals={[meal]} />);
        const macros = within(
            screen.getByRole('group', { name: 'Macro energy distribution' }),
        );

        expect(
            macros.getByRole('progressbar', { name: 'Protein' }),
        ).toBeVisible();
        expect(
            macros.getByRole('progressbar', { name: 'Carbohydrates' }),
        ).toBeVisible();
        expect(macros.getByRole('progressbar', { name: 'Fat' })).toBeVisible();
    });

    it('names the meal distribution group and each meal progress bar', () => {
        renderWithUser(<NutritionSummary meals={[meal]} />);
        const distribution = within(
            screen.getByRole('group', { name: 'Calories by meal' }),
        );

        expect(
            distribution.getByRole('progressbar', { name: 'Oats' }),
        ).toHaveAttribute('aria-valuenow', '100');
    });
});
