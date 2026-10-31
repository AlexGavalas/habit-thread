import NextAuth from 'next-auth';
import { type NextRequest } from 'next/server';

import { authOptions } from '~api/auth-options';

const handler = async (
    request: NextRequest,
    context: { params: Promise<{ nextauth: string[] }> },
): Promise<Response> => {
    // NextAuth v4 declares its return value as any, even for App Router requests.
    const response: unknown = await NextAuth(request, context, authOptions);
    if (!(response instanceof Response)) {
        throw new Error('NextAuth did not return a Response');
    }
    return response;
};

export { handler as GET, handler as POST };
