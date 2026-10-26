// @ts-check

/**
 * @type {import('next').NextConfig}
 **/
const config = {
    reactCompiler: true,
    // Keep PDF.js worker/native dependency resolution in Node, not the Next bundle.
    serverExternalPackages: ['pdf-parse'],
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
