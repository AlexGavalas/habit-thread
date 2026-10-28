/** Route mocked requests by URL, failing on unexpected reads instead of hiding them. */
export const respondFrom =
    (responses: ReadonlyMap<RequestInfo | URL, Response>): typeof fetch =>
    (input) => {
        const response = responses.get(input);
        if (!response) {
            return Promise.reject(new Error('Unexpected fetch request'));
        }
        return Promise.resolve(response.clone());
    };
