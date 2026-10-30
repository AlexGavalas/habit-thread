import JSZip from 'jszip';
import { z } from 'zod';

import { emptyAccountExport } from '~test/account-export';

import { createAccountArchive, csvCell } from './archive';

describe('account archive', () => {
    it.each([
        '=SUM(A1)',
        '+cmd',
        '-cmd',
        '@cmd',
        ' \t=cmd',
        '\tplain',
        '\rplain',
        '\nplain',
        '\u0000=cmd',
    ])('neutralizes spreadsheet text %j', (text) => {
        expect(csvCell(text)).toBe(`"'${text}"`);
    });

    it('escapes quotes, commas, line breaks, Unicode and nullable values without changing numbers', () => {
        expect(csvCell('Γεύμα, "καλό"\nναι')).toBe('"Γεύμα, ""καλό""\nναι"');
        expect(csvCell(null)).toBe('""');
        expect(csvCell('')).toBe('""');
        expect(csvCell(-7)).toBe('"-7"');
        expect(csvCell(false)).toBe('"false"');
    });

    it('serializes recurring schedule objects as escaped JSON text in CSV', () => {
        expect(
            csvCell({
                kind: 'daily',
                slots: [{ key: 'lunch', label: 'Γεύμα', time: '12:00' }],
            }),
        ).toBe(
            '"{""kind"":""daily"",""slots"":[{""key"":""lunch"",""label"":""Γεύμα"",""time"":""12:00""}]}"',
        );
    });

    it('produces a readable versioned ZIP, lossless JSON and CSV for every table including empty tables', async () => {
        expect.hasAssertions();
        const data = emptyAccountExport();
        data.meals = [
            {
                day: '2026-01-02',
                id: 'meal-1',
                meal: '=Γεύμα, "ένα"\nδύο',
                note: null,
                rating: 4,
                sectionKey: 'lunch',
                userId: 7,
            },
        ];
        const zip = await JSZip.loadAsync(
            await createAccountArchive(data, new Date('2026-01-03T12:34:56Z')),
            { checkCRC32: true },
        );
        const json = await zip.file('export.json')?.async('string');
        const parsed = z
            .object({
                data: z.unknown(),
                formatVersion: z.literal(1),
                generatedAt: z.string(),
            })
            .parse(JSON.parse(z.string().parse(json)));
        expect(parsed).toStrictEqual({
            data,
            formatVersion: 1,
            generatedAt: '2026-01-03T12:34:56.000Z',
        });
        await expect(
            zip.file('csv/meals.csv')?.async('string'),
        ).resolves.toContain(`"'=Γεύμα, ""ένα""\nδύο"`);
        await expect(
            zip.file('csv/activities.csv')?.async('string'),
        ).resolves.toBe('\uFEFF"activity","date","id","userId"\r\n');
        expect(
            Object.keys(zip.files).filter((name) => name.endsWith('.csv')),
        ).toHaveLength(18);
        await expect(
            zip.file('README.txt')?.async('string'),
        ).resolves.toContain('Generated at: 2026-01-03T12:34:56.000Z');
    });
});
