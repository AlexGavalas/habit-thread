import { endOfWeek, format, startOfWeek } from 'date-fns';
import { partition } from 'lodash/fp';

import {
    type EditedMeal,
    type EditedMealItem,
    type Meal,
    type MealsMap,
} from '~types/meal';

export type DeleteEntryCell = (params: { meal: Meal | EditedMeal }) => void;
export type DeleteEntryRow = (id: string) => void;

export type MealSlot = Readonly<{
    sectionKey: string;
    day: string;
}>;

export type SwapEntries = (source: MealSlot, destination: MealSlot) => void;

export type SaveEntryCell = (params: {
    meal?: Meal | EditedMeal;
    sectionKey: string;
    timestamp: Date;
    userId: number;
    value: string;
    items?: EditedMealItem[];
    note: EditedMeal['note'];
    rating: EditedMeal['rating'];
}) => void;

export type SaveEntryRow = (params: {
    sectionKey: string;
    userId: number;
    value: string;
    items?: EditedMealItem[];
    note: EditedMeal['note'];
    rating: EditedMeal['rating'];
}) => void;

export const createMealChange = ({
    meal,
    sectionKey,
    timestamp,
    userId,
    value,
    items,
    note,
    rating,
}: Parameters<SaveEntryCell>[0]): EditedMeal => ({
    ...meal,
    day: format(timestamp, 'yyyy-MM-dd'),
    items: items ?? meal?.items ?? [],
    meal: value,
    note,
    rating,
    section_key: sectionKey,
    user_id: userId,
});

export type UseMeals = (explicitOwnerUserId?: number) => {
    meals: Meal[];
    isLoading: boolean;
    savePlan: () => Promise<boolean>;
    revert: () => void;
    deleteEntryCell: DeleteEntryCell;
    deleteEntryRow: DeleteEntryRow;
    saveEntryCell: SaveEntryCell;
    saveEntryRow: SaveEntryRow;
    swapEntries: SwapEntries;
};

type MealPlanChanges = {
    deletedIds: string[];
    editedMeals: EditedMeal[];
    newMeals: EditedMeal[];
    ownerUserId?: number;
};

type WeekRange = {
    endDate: string;
    startDate: string;
};

export const getMealPlanChanges = (
    unsavedChanges: Record<string, Meal | EditedMeal>,
    ownerUserId: number | undefined,
): MealPlanChanges => {
    const [changedMeals, newMeals] = partition(
        'id',
        Object.values(unsavedChanges),
    );
    const [editedMeals, deletedMeals] = partition('meal', changedMeals);

    return {
        deletedIds: deletedMeals.flatMap(({ id }) => (id ? [id] : [])),
        editedMeals,
        // Empty drafts mask the saved source after a move, but are not new meals.
        newMeals: newMeals.filter((meal) => meal.meal),
        ...(ownerUserId ? { ownerUserId } : {}),
    };
};

export const getMealsMap = (meals: Meal[]): MealsMap =>
    meals.reduce<MealsMap>((result, meal) => {
        result[meal.section_key] = meal;
        return result;
    }, {});

// Empty drafts are persistence markers for moves/deletions, not edited meals.
export const isMealSlotEdited = (
    changes: MealsMap,
    sectionKey: string,
): boolean => Boolean(changes[sectionKey]?.meal);

export const swapMealSlots = ({
    changes,
    meals,
    source,
    destination,
    userId,
}: {
    changes: MealsMap;
    meals: MealsMap;
    source: MealSlot;
    destination: MealSlot;
    userId: number;
}): MealsMap => {
    const sourceMeal = changes[source.sectionKey] ?? meals[source.sectionKey];
    const destinationMeal =
        changes[destination.sectionKey] ?? meals[destination.sectionKey];

    if (source.sectionKey === destination.sectionKey || !sourceMeal?.meal) {
        return changes;
    }

    return {
        ...changes,
        // Exchange records, including deletion markers, rather than copying
        // content onto the destination ID. Annotations belong to the meal.
        [source.sectionKey]: {
            ...(destinationMeal ?? { meal: '', user_id: userId }),
            day: source.day,
            section_key: source.sectionKey,
        },
        [destination.sectionKey]: {
            ...sourceMeal,
            day: destination.day,
            section_key: destination.sectionKey,
        },
    };
};

export const getWeekRange = (currentWeek: Date): WeekRange => ({
    endDate: format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    startDate: format(
        startOfWeek(currentWeek, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    ),
});
