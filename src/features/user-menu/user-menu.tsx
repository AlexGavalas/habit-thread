import { Group, Menu, UnstyledButton } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { NavArrowDown } from 'iconoir-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import {
    type ComponentPropsWithoutRef,
    type MouseEventHandler,
    forwardRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import { UserAvatar } from '~components/user-avatar';
import { InstallApp } from '~features/install-app';
import { NAV_LINKS, PROFESSIONAL_LINK } from '~features/nav/nav';
import { useLocalizedPath } from '~hooks/use-localized-path';
import { useProfile } from '~hooks/use-profile';
import { getInitials } from '~util/name';

import styles from './user-menu.module.css';

const MenuTrigger = forwardRef<
    HTMLButtonElement,
    ComponentPropsWithoutRef<'button'>
>((props, ref) => {
    return (
        <UnstyledButton ref={ref} className={styles.trigger} {...props}>
            <Group gap="tight" wrap="nowrap">
                <UserAvatar />
                <NavArrowDown aria-hidden className={styles.chevron} />
            </Group>
        </UnstyledButton>
    );
});

MenuTrigger.displayName = 'MenuTrigger';

export const UserMenu = ({
    isProfessional = false,
}: Readonly<{ isProfessional?: boolean }>): ReactElement => {
    const localize = useLocalizedPath();
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { user } = useProfile();
    // Include the visible initials so speech users can name the displayed control.
    const menuLabel = [
        getInitials(user?.name),
        user?.name,
        t('navigation.open_menu'),
    ]
        .filter(Boolean)
        .join(' ');
    const links = isProfessional
        ? [PROFESSIONAL_LINK, ...NAV_LINKS]
        : NAV_LINKS;

    const handleLogout = (async (): Promise<void> => {
        queryClient.clear();

        await signOut({ callbackUrl: '/' });

        router.push('/');
        router.refresh();
    }) satisfies MouseEventHandler<HTMLButtonElement>;

    return (
        <Menu
            keepMounted
            withArrow
            arrowPosition="center"
            keepMountedMode="display-none"
            position="bottom-end"
            width={220}
        >
            <Menu.Target>
                <MenuTrigger aria-label={menuLabel} />
            </Menu.Target>
            <Menu.Dropdown>
                <div className={styles.mobileNavigation}>
                    <Menu.Label>{t('navigation.label')}</Menu.Label>
                    {links.map(({ href, label }) => {
                        const localizedHref = localize(href);

                        return (
                            <Menu.Item
                                key={href}
                                aria-current={
                                    pathname === localizedHref
                                        ? 'page'
                                        : undefined
                                }
                                className={styles.menuItem}
                                component={Link}
                                href={localizedHref}
                            >
                                {t(label)}
                            </Menu.Item>
                        );
                    })}
                    <Menu.Divider />
                </div>
                <InstallApp placement="menu" />
                <Menu.Item component={Link} href={localize('/settings')}>
                    {t('settings')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="danger" onClick={handleLogout}>
                    {t('logout')}
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
};
