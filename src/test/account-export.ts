import type { AccountExportData } from '~api/account-export/data';
import type { UserProfile } from '~types/user';

export const exportUser: UserProfile = {
    created_at: '2026-01-01T00:00:00Z',
    email: 'owner@example.test',
    food_preferences_negative: null,
    food_preferences_positive: 'Ελληνικά',
    full_name: 'Δοκιμή',
    has_completed_onboarding: true,
    height: 170,
    id: 7,
    is_discoverable: false,
    language: 'gr',
    roles: [],
    target_weight: null,
};

export const emptyAccountExport = (): AccountExportData => ({
    activities: [],
    connections: [],
    importUsage: [],
    library: [],
    libraryItems: [],
    mealItems: [],
    meals: [],
    measurements: [],
    notificationPreferences: [],
    notifications: [],
    professionalRelationships: [],
    profile: [],
    reminderDeliveries: [],
    roles: [],
    scheduleTemplates: [],
    signupOrigins: [],
    zoneTimes: [],
    zones: [],
});
