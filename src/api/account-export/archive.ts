import 'server-only';
import JSZip from 'jszip';

import type { ScheduleTemplate } from '~schemas/schedule-template';

import { exportColumns } from './columns';
import type { AccountExportData } from './data';
import { EXPORT_README } from './readme';

type Cell = string | number | boolean | null | ScheduleTemplate;

export const csvCell = (value: Cell): string => {
    if (value === null) {
        return '""';
    }
    const text =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
    const safe =
        typeof value === 'string' &&
        (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text))
            ? `'${text}`
            : text;
    return `"${safe.replaceAll('"', '""')}"`;
};

export const createAccountArchive = async (
    data: AccountExportData,
    generatedAt: Date,
): Promise<Uint8Array<ArrayBuffer>> => {
    const zip = new JSZip();
    zip.file(
        'export.json',
        JSON.stringify(
            { data, formatVersion: 1, generatedAt: generatedAt.toISOString() },
            null,
            2,
        ),
    );
    zip.file(
        'README.txt',
        `Generated at: ${generatedAt.toISOString()}\n\n${EXPORT_README}`,
    );
    for (const [name, columns] of Object.entries(exportColumns)) {
        const fields = Object.keys(columns);
        // Entry names and columns come from the fixed allowlist, never user input.
        const records: Record<string, Cell>[] =
            Object.entries(data).find(([key]) => key === name)?.[1] ?? [];
        const rows = records.map((record) =>
            fields.map((field) => csvCell(record[field] ?? null)).join(','),
        );
        zip.file(
            `csv/${name}.csv`,
            `\uFEFF${fields.map(csvCell).join(',')}\r\n${rows.join('\r\n')}${rows.length ? '\r\n' : ''}`,
        );
    }
    return new Uint8Array(
        await zip.generateAsync({ compression: 'DEFLATE', type: 'uint8array' }),
    );
};
