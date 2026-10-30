import { createAccountArchive } from '~api/account-export/archive';
import { readAccountExport } from '~api/account-export/data';
import { getCurrentUser } from '~api/session';

export const runtime = 'nodejs';

const privateHeaders = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
};

// A download is an HTTP resource, not a mutation. No submitted identity is used.
export const GET = async (): Promise<Response> => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new Response(null, { headers: privateHeaders, status: 401 });
        }
        const generatedAt = new Date();
        const data = await readAccountExport(user.id);
        if (data.profile.length !== 1) {
            return new Response(null, { headers: privateHeaders, status: 401 });
        }
        const archive = await createAccountArchive(data, generatedAt);
        const filename = `habitthread-export-v1-${generatedAt.toISOString().slice(0, 10)}.zip`;
        return new Response(archive, {
            headers: {
                ...privateHeaders,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': 'application/zip',
            },
        });
    } catch (error) {
        console.error('Account export failed', error);
        return new Response(null, { headers: privateHeaders, status: 500 });
    }
};
