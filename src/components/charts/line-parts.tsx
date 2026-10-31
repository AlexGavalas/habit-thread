import { Card } from '@mantine/core';
import { format, isValid, parse } from 'date-fns';
import type { ReactElement } from 'react';
import { type TooltipContentProps, type XAxisTickContentProps } from 'recharts';
import { z } from 'zod';

export type ChartPoint = {
    date: string;
    index: number;
    value: number | null;
};

const pointMetadataSchema = z.object({ index: z.number() });

const formatDate = (value: unknown): string => {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return '-';
    }

    const date = parse(String(value), 'yyyy-MM-dd', new Date());

    return isValid(date) ? format(date, 'dd/MM/yy') : '-';
};

export const getTicks = (min: number, max: number, count = 10): number[] => {
    const roughStep = Math.abs(max - min) / count;

    if (!roughStep) {
        return [min];
    }

    const power = Math.floor(Math.log10(roughStep));
    const powerOfTen = 10 ** power;
    const error = roughStep / powerOfTen;
    const factor =
        error >= Math.sqrt(50)
            ? 10
            : error >= Math.sqrt(10)
              ? 5
              : error >= Math.sqrt(2)
                ? 2
                : 1;
    const step = factor * powerOfTen;
    const first = Math.ceil(min / step) * step;
    const last = Math.floor(max / step) * step;
    const length = Math.round((last - first) / step) + 1;

    return Array.from({ length }, (_, index) =>
        Number((first + index * step).toPrecision(12)),
    );
};

export const DateTick = ({
    index,
    payload,
    visibleTicksCount,
    x,
    y,
}: XAxisTickContentProps): ReactElement => {
    const isFirst = index === 0;
    const isLast = index === visibleTicksCount - 1;
    const textAnchor =
        isFirst && isLast
            ? 'middle'
            : isFirst
              ? 'start'
              : isLast
                ? 'end'
                : 'middle';

    return (
        <text
            dominantBaseline="text-before-edge"
            fill="var(--app-color-chart-text)"
            fontSize={12}
            textAnchor={textAnchor}
            x={x}
            y={Number(y) + 10}
        >
            {formatDate(payload.value)}
        </text>
    );
};

type ChartTooltipProps = TooltipContentProps<number, string> &
    Readonly<{
        dataLength: number;
        max: number;
        unit: string;
    }>;

export const ChartTooltip = ({
    active,
    dataLength,
    label,
    max,
    payload,
    unit,
}: ChartTooltipProps): ReactElement | null => {
    const item = payload[0];

    if (!active || !item || typeof item.value !== 'number') {
        return null;
    }

    const parsed = pointMetadataSchema.safeParse(item.payload);
    const point = parsed.success ? parsed.data : undefined;
    const transforms = [];

    if (point?.index === 0) {
        transforms.push('translateX(50%)');
    } else if (point?.index === dataLength - 1) {
        transforms.push('translateX(-50%)');
    }

    if (max - item.value < 3) {
        transforms.push('translateY(75%)');
    }

    return (
        <Card
            withBorder
            shadow="md"
            style={{ transform: transforms.join(' ') || undefined }}
        >
            {formatDate(label ?? '-')}: {item.value} {unit}
        </Card>
    );
};

export const getTargetValue = (target?: number): number | undefined => {
    if (target && target > 0) {
        return target;
    }
};
