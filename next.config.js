// @ts-check

/**
 * @type {import('next').NextConfig}
 **/
const config = {
    reactCompiler: true,
    // Keep unpdf's self-resolved, inlined PDF.js worker in its serverless package.
    serverExternalPackages: ['unpdf'],
    experimental: {
        agentUpgrade: 'latest',
        turbopackRustReactCompiler: true,
    },
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.googleusercontent.com',
                port: '',
                pathname: '**',
            },
        ],
    },
    async rewrites() {
        return [{ source: '/:locale(en|gr)/:path*', destination: '/:path*' }];
    },
};

module.exports = config;
