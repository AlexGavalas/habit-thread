import { z } from 'zod';

export const professionalSummarySchema = z.object({
    email: z.string(),
    fullName: z.string(),
    id: z.number(),
});

export const professionalClientSummarySchema = professionalSummarySchema.extend(
    {
        relationshipId: z.string(),
    },
);

export const professionalInvitationSchema =
    professionalClientSummarySchema.extend({
        createdAt: z.string(),
    });

export const professionalConnectionStateSchema = z.object({
    currentProfessional: professionalClientSummarySchema.nullable(),
    incomingInvitations: z.array(professionalInvitationSchema),
    outgoingInvitations: z.array(professionalInvitationSchema),
});

export const professionalConnectionsResponseSchema = z.object({
    data: professionalConnectionStateSchema,
});

export const professionalSearchResponseSchema = z.object({
    data: z.array(professionalSummarySchema),
});
