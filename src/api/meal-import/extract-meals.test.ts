import { assertMealImportConfigured, extractMeals } from './extract-meals';

const mockGenerate = jest.fn<Promise<unknown>, [unknown]>();

jest.mock('@ai-sdk/openai', () => ({
    createOpenAI: jest.fn(() => jest.fn((model: string) => model)),
}));
jest.mock('ai', () => ({
    Output: { object: jest.fn((value: unknown) => value) },
    generateText: (options: unknown): Promise<unknown> => mockGenerate(options),
}));

describe('ai meal extraction', () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalModel = process.env.OPENAI_MEAL_IMPORT_MODEL;

    beforeEach(() => {
        process.env.OPENAI_API_KEY = 'test-placeholder-not-a-real-key';
        delete process.env.OPENAI_MEAL_IMPORT_MODEL;
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });
    afterEach(() => {
        if (originalKey === undefined) {
            delete process.env.OPENAI_API_KEY;
        } else {
            process.env.OPENAI_API_KEY = originalKey;
        }
        if (originalModel === undefined) {
            delete process.env.OPENAI_MEAL_IMPORT_MODEL;
        } else {
            process.env.OPENAI_MEAL_IMPORT_MODEL = originalModel;
        }
        jest.restoreAllMocks();
    });

    it('requires server configuration', () => {
        delete process.env.OPENAI_API_KEY;
        expect(assertMealImportConfigured).toThrow('unavailable');
    });

    it('preserves language, short meals and distinct quantities, removing only exact duplicates', async () => {
        expect.hasAssertions();
        mockGenerate.mockResolvedValueOnce({
            finishReason: 'stop',
            output: {
                meals: [' Eggs ', 'Eggs', 'Γιαούρτι\n200g', 'Γιαούρτι 100g'],
            },
            usage: { inputTokens: 100, outputTokens: 30 },
        });
        await expect(extractMeals('untrusted document')).resolves.toStrictEqual(
            ['Eggs', 'Γιαούρτι 200g', 'Γιαούρτι 100g'],
        );
        expect(mockGenerate).toHaveBeenCalledWith(
            expect.objectContaining({
                maxOutputTokens: 8000,
                maxRetries: 0,
                model: 'gpt-4.1-mini',
                prompt: 'untrusted document',
                providerOptions: { openai: { store: false } },
                timeout: 45_000,
            }),
        );
    });

    it.each([
        { finishReason: 'stop', output: { meals: [] } },
        { finishReason: 'stop', output: { meals: [42] } },
        { finishReason: 'stop', output: { meals: [''] } },
        { finishReason: 'length', output: { meals: ['Partial meal'] } },
    ])('rejects empty, malformed and truncated results: %j', async (result) => {
        expect.hasAssertions();
        mockGenerate.mockResolvedValueOnce(result);
        await expect(extractMeals('document')).rejects.toThrow(
            /no_meals|extraction_failed/u,
        );
    });

    it('does not expose provider error details', async () => {
        expect.hasAssertions();
        mockGenerate.mockRejectedValueOnce(
            new Error('private document and provider details'),
        );
        await expect(extractMeals('document')).rejects.toThrow(
            'extraction_failed',
        );
    });
});
