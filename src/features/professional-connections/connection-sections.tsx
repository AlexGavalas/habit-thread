import { Button, Divider, Stack, Text, TextInput, Title } from '@mantine/core';
import type { ReactElement } from 'react';
import { type ChangeEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import {
    type ProfessionalConnectionState,
    type ProfessionalSummary,
} from '~types/professional';

import {
    inviteProfessional,
    removeProfessionalRelationship,
} from '../../app/actions';
import { InvitationActions } from './invitation-actions';
import { Person } from './person';

export type ConnectionState = ProfessionalConnectionState;

type RunAction = (
    action: () => Promise<{ error?: string; ok: boolean }>,
) => Promise<void>;

type ConnectionSectionsProps = Readonly<{
    isProfessional: boolean;
    isSearchOpen: boolean;
    isSearching: boolean;
    onSearchChange: ChangeEventHandler<HTMLInputElement>;
    professionals: ProfessionalSummary[];
    run: RunAction;
    search: string;
    state?: ConnectionState;
}>;

export const ConnectionSections = ({
    isProfessional,
    isSearchOpen,
    isSearching,
    onSearchChange,
    professionals,
    run,
    search,
    state,
}: ConnectionSectionsProps): ReactElement => {
    const { t } = useTranslation();
    const pendingIds = new Set(
        state?.outgoingInvitations.map(({ id }) => id) ?? [],
    );
    const current = state?.currentProfessional;
    const handleStopClient = (): void => {
        if (current) {
            void run(() =>
                removeProfessionalRelationship({
                    relationshipId: current.relationshipId,
                }),
            );
        }
    };

    return (
        <>
            <Stack gap="sm">
                <Title order={4}>
                    {t('professional.connections.current_title')}
                </Title>
                {current ? (
                    <Person
                        {...current}
                        actions={
                            <Button
                                color="danger"
                                onClick={handleStopClient}
                                variant="outline"
                            >
                                {t('professional.connections.stop_client')}
                            </Button>
                        }
                    />
                ) : (
                    <Text>{t('professional.connections.no_current')}</Text>
                )}
            </Stack>
            {!current && isSearchOpen && (
                <Stack gap="sm">
                    <TextInput
                        label={t('professional.connections.search_label')}
                        loading={isSearching}
                        onChange={onSearchChange}
                        placeholder={t(
                            'professional.connections.search_placeholder',
                        )}
                        value={search}
                    />
                    {professionals.map((professional) => {
                        const isPending = pendingIds.has(professional.id);
                        const handleInviteProfessional = (): void => {
                            void run(() =>
                                inviteProfessional({
                                    professionalUserId: professional.id,
                                }),
                            );
                        };
                        return (
                            <Person
                                key={professional.id}
                                {...professional}
                                actions={
                                    <Button
                                        disabled={isPending}
                                        onClick={handleInviteProfessional}
                                    >
                                        {t(
                                            isPending
                                                ? 'professional.connections.pending'
                                                : 'professional.connections.invite',
                                        )}
                                    </Button>
                                }
                            />
                        );
                    })}
                </Stack>
            )}
            {(state?.outgoingInvitations.length ?? 0) > 0 && (
                <Stack gap="sm">
                    <Title order={4}>
                        {t('professional.connections.outgoing_title')}
                    </Title>
                    {state?.outgoingInvitations.map((invitation) => (
                        <Person
                            key={invitation.relationshipId}
                            {...invitation}
                            actions={
                                <InvitationActions
                                    relationshipId={invitation.relationshipId}
                                    run={run}
                                />
                            }
                        />
                    ))}
                </Stack>
            )}
            {isProfessional && (
                <>
                    <Divider />
                    <Stack gap="sm">
                        <Title order={4}>
                            {t('professional.connections.incoming_title')}
                        </Title>
                        {!state?.incomingInvitations.length && (
                            <Text>
                                {t('professional.connections.no_incoming')}
                            </Text>
                        )}
                        {state?.incomingInvitations.map((invitation) => (
                            <Person
                                key={invitation.relationshipId}
                                {...invitation}
                                actions={
                                    <InvitationActions
                                        incoming
                                        relationshipId={
                                            invitation.relationshipId
                                        }
                                        run={run}
                                    />
                                }
                            />
                        ))}
                    </Stack>
                </>
            )}
        </>
    );
};
