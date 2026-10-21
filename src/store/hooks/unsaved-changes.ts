import { useAtom } from 'jotai';
import { omit, set } from 'lodash/fp';

import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { unsavedChangesAtom } from '~store/atoms';
import { type EditedMeal, type Meal } from '~types/meal';

type AddChange = (params: Meal | EditedMeal) => void;

type RemoveChange = (key: string) => void;

type RemoveChanges = () => void;

type UseUnsavedChanges = () => {
    unsavedChanges: Record<string, Meal | EditedMeal>;
    addChange: AddChange;
    removeChange: RemoveChange;
    removeChanges: RemoveChanges;
    hasUnsavedChanges: boolean;
    updateChanges: (
        update: (
            changes: Record<string, Meal | EditedMeal>,
        ) => Record<string, Meal | EditedMeal>,
    ) => void;
};

export const useUnsavedChanges = (
    explicitOwnerUserId?: number,
): ReturnType<UseUnsavedChanges> => {
    const ownerUserId = useMealPlanOwnerId(explicitOwnerUserId);
    const ownerKey = String(ownerUserId ?? 'anonymous');
    const [changesByOwner, setUnsavedChanges] = useAtom(unsavedChangesAtom);
    const unsavedChanges = changesByOwner[ownerKey] ?? {};

    const addChange: AddChange = (meal) => {
        setUnsavedChanges((prevChanges) => ({
            ...prevChanges,
            [ownerKey]: set(
                meal.section_key,
                meal,
                prevChanges[ownerKey] ?? {},
            ),
        }));
    };

    const updateChanges: ReturnType<UseUnsavedChanges>['updateChanges'] = (
        update,
    ) => {
        setUnsavedChanges((prevChanges) => ({
            ...prevChanges,
            [ownerKey]: update(prevChanges[ownerKey] ?? {}),
        }));
    };

    const removeChange: RemoveChange = (key) => {
        setUnsavedChanges((prevChanges) => ({
            ...prevChanges,
            [ownerKey]: omit(key, prevChanges[ownerKey] ?? {}),
        }));
    };

    const removeChanges: RemoveChanges = () => {
        setUnsavedChanges((prevChanges) => omit(ownerKey, prevChanges));
    };

    return {
        addChange,
        hasUnsavedChanges: Object.keys(unsavedChanges).length > 0,
        removeChange,
        removeChanges,
        unsavedChanges,
        updateChanges,
    };
};
