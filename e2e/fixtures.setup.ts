import { test as setup } from '@playwright/test';

import {
    AUTH_STATE_PATH,
    E2E_FIXTURES,
    PROFESSIONAL_AUTH_STATE_PATH,
    VISUAL_AUTH_STATE_PATH,
} from './support/auth';
import { provisionFixture } from './support/provision';

for (const { fixture, storageState } of [
    { fixture: E2E_FIXTURES.client, storageState: AUTH_STATE_PATH },
    {
        fixture: E2E_FIXTURES.professional,
        storageState: PROFESSIONAL_AUTH_STATE_PATH,
    },
    { fixture: E2E_FIXTURES.visual, storageState: VISUAL_AUTH_STATE_PATH },
]) {
    setup(`provision ${fixture.user.fullName}`, async ({ page }) => {
        setup.slow();
        await provisionFixture(page, fixture);
        await page.context().storageState({ path: storageState });
    });
}
