import {
    ActionIcon,
    type ActionIconProps,
    type ActionIconVariant,
    CopyButton as MantineCopyButton,
    Tooltip,
    type TooltipProps,
} from '@mantine/core';
import { Check, Copy } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

type CopyButtonProps2 = Readonly<{
    radius?: ActionIconProps['radius'];
    value: Readonly<string>;
    variant?: ActionIconVariant;
    size?: ActionIconProps['size'];
    tooltipPosition?: TooltipProps['position'];
}>;

export const CopyButton = ({
    radius,
    value,
    variant = 'outline',
    size = 'lg',
    tooltipPosition,
}: CopyButtonProps2): ReactElement => {
    const { t } = useTranslation();

    return (
        <MantineCopyButton timeout={2000} value={value}>
            {({ copied, copy: handleCopy }) => (
                <Tooltip
                    events={{ focus: true, hover: true, touch: false }}
                    withArrow
                    label={copied ? t('util.copied') : t('util.copy')}
                    position={tooltipPosition}
                >
                    <ActionIcon
                        aria-label={copied ? t('util.copied') : t('util.copy')}
                        onClick={handleCopy}
                        radius={radius}
                        size={size}
                        variant={variant}
                    >
                        {copied ? <Check /> : <Copy />}
                    </ActionIcon>
                </Tooltip>
            )}
        </MantineCopyButton>
    );
};
