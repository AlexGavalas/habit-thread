import { execFileSync } from 'node:child_process';
import {
    copyFile,
    lstat,
    mkdir,
    mkdtemp,
    readFile,
    readlink,
    rm,
    symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
    dirname,
    isAbsolute,
    join,
    parse,
    relative,
    resolve,
    sep,
} from 'node:path';
import { z } from 'zod';

const traceSchema = z.object({ files: z.array(z.string()) });

// Preserve relative module resolution, including pnpm and Turbopack symlinks.
// The temporary tree is outside the checkout so missing files cannot fall back
// to the developer's full node_modules installation.
const packagedPath = (root: string, source: string): string =>
    join(root, relative(parse(source).root, source));

const copyTracedFile = async (root: string, source: string): Promise<void> => {
    const destination = packagedPath(root, source);
    await mkdir(dirname(destination), { recursive: true });
    const stat = await lstat(source);
    if (stat.isSymbolicLink()) {
        const target = await readlink(source);
        await symlink(
            isAbsolute(target) ? packagedPath(root, target) : target,
            destination,
        );
        return;
    }
    if (stat.isFile()) {
        await copyFile(source, destination);
        return;
    }
    await mkdir(destination, { recursive: true });
};

const smokeTest = `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const [routePath, parserPath, fixture] = process.argv.slice(1);
const require = createRequire(pathToFileURL(routePath));
const { routeModule } = require(routePath);
await routeModule.ensureUserland();
assert.equal(typeof routeModule.userland.POST, 'function');
const { getDocumentProxy, extractText } = await import(pathToFileURL(parserPath).href);
const document = await getDocumentProxy(new Uint8Array(Buffer.from(fixture, 'base64')));
try {
    const result = await extractText(document, { mergePages: false });
    assert.equal(result.totalPages, 1);
    assert.deepEqual(result.text.map(page => page.trim()), ['Eggs']);
} finally {
    await document.loadingTask.destroy();
}
console.log('Packaged upload route and PDF text extraction passed');
`;

const main = async (): Promise<void> => {
    const routePath = resolve('.next/server/app/api/v1/pool/upload/route.js');
    const trace = traceSchema.parse(
        JSON.parse(await readFile(`${routePath}.nft.json`, 'utf8')),
    );
    const sources = [
        routePath,
        ...trace.files.map((file) => resolve(dirname(routePath), file)),
    ];
    const parserManifest = sources.find((file) =>
        file.endsWith(`${sep}unpdf${sep}package.json`),
    );
    if (!parserManifest) {
        throw new Error('The upload trace does not include the unpdf package');
    }
    // This fixture is a one-page, text-only PDF containing "Eggs".
    const fixture = await readFile(
        'src/test/fixtures/meal-import.pdf.base64',
        'utf8',
    );
    const root = await mkdtemp(join(tmpdir(), 'habitthread-meal-import-'));
    try {
        for (const source of new Set(sources)) {
            await copyTracedFile(root, source);
        }
        execFileSync(
            process.execPath,
            [
                '--input-type=module',
                '--eval',
                smokeTest,
                packagedPath(root, routePath),
                packagedPath(
                    root,
                    join(dirname(parserManifest), 'dist/index.mjs'),
                ),
                fixture.trim(),
            ],
            {
                cwd: root,
                env: {
                    GOOGLE_ID: 'packaged-smoke-google-id',
                    GOOGLE_SECRET: 'packaged-smoke-google-secret',
                    NODE_ENV: 'production',
                    NODE_PATH: '',
                },
                stdio: 'inherit',
                timeout: 30_000,
            },
        );
    } finally {
        await rm(root, { force: true, recursive: true });
    }
};

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
