import type { InferSelectModel } from 'drizzle-orm';
import type { z } from 'zod';

import type { professionalClients } from '~db/schema';
import type {
    professionalClientSummarySchema,
    professionalConnectionStateSchema,
    professionalInvitationSchema,
    professionalSummarySchema,
} from '~schemas/professional';

export type ProfessionalClientRelationship = InferSelectModel<
    typeof professionalClients
>;

export type ProfessionalSummary = z.infer<typeof professionalSummarySchema>;
export type ProfessionalClientSummary = z.infer<
    typeof professionalClientSummarySchema
>;
export type ProfessionalInvitation = z.infer<
    typeof professionalInvitationSchema
>;
export type ProfessionalConnectionState = z.infer<
    typeof professionalConnectionStateSchema
>;

export type PaginatedProfessionalClients = {
    clients: ProfessionalClientSummary[];
    page: number;
    pageCount: number;
    total: number;
};
