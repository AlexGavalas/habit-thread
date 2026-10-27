import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import 'server-only';

import { getDb } from '~db';
import { measurements } from '~db/schema';
import { type Measurement, type MeasurementSummary } from '~types/measurement';
import { getMeasurementSummary } from '~util/measurement';

const MAX_MEASUREMENTS = 12;

export const fetchLatestFatMeasurement = async ({
    userId,
}: {
    userId: number;
}): Promise<{ data: Pick<Measurement, 'fat_percentage'>[] }> => ({
    data: await getDb()
        .select({ fat_percentage: measurements.fat_percentage })
        .from(measurements)
        .where(
            and(
                eq(measurements.user_id, userId),
                isNotNull(measurements.fat_percentage),
            ),
        )
        .orderBy(desc(measurements.date))
        .limit(1),
});

export const fetchLatestWeightMeasurement = async ({
    userId,
}: {
    userId: number;
}): Promise<{ data: Pick<Measurement, 'weight'>[] }> => ({
    data: await getDb()
        .select({ weight: measurements.weight })
        .from(measurements)
        .where(
            and(
                eq(measurements.user_id, userId),
                isNotNull(measurements.weight),
            ),
        )
        .orderBy(desc(measurements.date))
        .limit(1),
});

const fetchLatest = async (
    userId: number,
    field: 'weight' | 'fat_percentage',
): Promise<Pick<Measurement, 'date' | 'fat_percentage' | 'weight'>[]> =>
    getDb()
        .select({
            date: measurements.date,
            fat_percentage: measurements.fat_percentage,
            weight: measurements.weight,
        })
        .from(measurements)
        .where(
            and(
                eq(measurements.user_id, userId),
                isNotNull(measurements[field]),
            ),
        )
        .orderBy(desc(measurements.date))
        .limit(MAX_MEASUREMENTS);

export const fetchMeasurements = async ({
    userId,
}: {
    userId: number;
}): Promise<{ data: Pick<Measurement, 'date' | 'weight'>[] }> => ({
    data: (await fetchLatest(userId, 'weight'))
        .reverse()
        .map(({ date, weight }) => ({
            date,
            weight,
        })),
});

export const fetchFatMeasurements = async ({
    userId,
}: {
    userId: number;
}): Promise<{ data: Pick<Measurement, 'date' | 'fat_percentage'>[] }> => ({
    data: (await fetchLatest(userId, 'fat_percentage'))
        .reverse()
        .map(({ date, fat_percentage }) => ({
            date,
            fat_percentage,
        })),
});

export const fetchMeasurementsCount = async ({
    userId,
}: {
    userId: number;
}): Promise<number> =>
    (
        await getDb()
            .select({ count: count() })
            .from(measurements)
            .where(eq(measurements.user_id, userId))
    )[0]?.count ?? 0;

export const fetchMeasurementsPaginated = async ({
    end,
    start,
    userId,
}: {
    end: number;
    start: number;
    userId: number;
}): Promise<Measurement[]> =>
    getDb()
        .select()
        .from(measurements)
        .where(eq(measurements.user_id, userId))
        .orderBy(desc(measurements.date))
        .limit(end - start + 1)
        .offset(start);

export const deleteMeasurement = async ({
    measurementId,
    userId,
}: {
    measurementId: string;
    userId: number;
}): Promise<{ error: null }> => {
    await getDb()
        .delete(measurements)
        .where(
            and(
                eq(measurements.id, measurementId),
                eq(measurements.user_id, userId),
            ),
        );

    return { error: null };
};

export const updateMeasurement = async ({
    date,
    fatPercent,
    measurementId,
    userId,
    weight,
}: {
    date: string;
    fatPercent?: number | null;
    measurementId?: string;
    userId: number;
    weight: number;
}): Promise<{ error: null }> => {
    const values = {
        date,
        fat_percentage: fatPercent ?? null,
        user_id: userId,
        weight,
    };

    const db = getDb();

    if (measurementId) {
        await db
            .update(measurements)
            .set(values)
            .where(
                and(
                    eq(measurements.id, measurementId),
                    eq(measurements.user_id, userId),
                ),
            );
    } else {
        await db.insert(measurements).values(values);
    }

    return { error: null };
};

export const fetchMeasurementSummary = async ({
    userId,
}: {
    userId: number;
}): Promise<MeasurementSummary> => {
    const [weight, fat] = await Promise.all([
        fetchMeasurements({ userId }),
        fetchFatMeasurements({ userId }),
    ]);

    return getMeasurementSummary(weight.data, fat.data);
};
