import { renderWithUser, screen } from '~test/utils';

import { ClientList } from './client-list';

const clients = [
    {
        email: 'client@example.test',
        fullName: 'Example Client',
        id: 42,
        relationshipId: '10accc9d-f0b7-4225-87df-3e91d5639d75',
    },
];

describe('<ClientList />', () => {
    it('selects a client when the email cell is clicked', async () => {
        expect.hasAssertions();

        const onSelectClient = jest.fn();
        const { user } = renderWithUser(
            <ClientList
                clients={clients}
                search=""
                onSelectClient={onSelectClient}
            />,
        );

        await user.click(screen.getByText('client@example.test'));

        expect(onSelectClient).toHaveBeenCalledTimes(1);
        expect(onSelectClient).toHaveBeenCalledWith(42);
    });

    it('keeps the client row keyboard accessible', async () => {
        expect.hasAssertions();

        const onSelectClient = jest.fn();
        const { user } = renderWithUser(
            <ClientList
                clients={clients}
                search=""
                onSelectClient={onSelectClient}
            />,
        );

        screen
            .getByRole('button', {
                name: 'Example Client client@example.test',
            })
            .focus();
        await user.keyboard('{Enter}');

        expect(onSelectClient).toHaveBeenCalledTimes(1);
        expect(onSelectClient).toHaveBeenCalledWith(42);
    });
});
