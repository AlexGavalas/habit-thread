'use client';

import { getDefaultZIndex } from '@mantine/core';
import { atom, useAtomValue, useStore } from 'jotai';
import {
    createContext,
    useContext,
    useId,
    useLayoutEffect,
    useRef,
    type ReactElement,
    type ReactNode,
} from 'react';

type OverlayLayer = {
    id: string;
    parentId: string | null;
    kind: 'dialog' | 'managed';
    onEscape: () => void;
};

export const overlayLayersAtom = atom<OverlayLayer[]>([]);
export const OverlayParentContext = createContext<string | null>(null);
const EscapeScopeContext = createContext(false);

export const getOverlayZIndex = (index: number): number =>
    getDefaultZIndex('modal') + Math.max(0, index);

type OverlayLayerOptions = Readonly<{
    opened: boolean;
    onClose: () => void;
    closeOnEscape?: boolean;
    returnFocus?: boolean;
    kind?: OverlayLayer['kind'];
    activeKey?: string;
}>;

export const useOverlayLayer = (
    options: OverlayLayerOptions,
): {
    id: string;
    isTopmost: boolean;
    zIndex: number;
} => {
    const id = useId();
    const parentId = useContext(OverlayParentContext);
    const store = useStore();
    const layers = useAtomValue(overlayLayersAtom);
    const latest = useRef(options);
    useLayoutEffect(() => {
        if (options.opened) {
            latest.current = options;
        }
    });
    const { opened, kind = 'dialog', activeKey } = options;
    const returnTarget = useRef<Element | null>(null);
    useLayoutEffect(() => {
        if (opened) {
            returnTarget.current = document.activeElement;
        }
    }, [opened]);
    useLayoutEffect(() => {
        if (!opened) {
            return;
        }
        const trigger = returnTarget.current;
        const layer: OverlayLayer = {
            id,
            kind,
            onEscape: () => {
                if (latest.current.closeOnEscape !== false) {
                    latest.current.onClose();
                }
            },
            parentId,
        };
        store.set(overlayLayersAtom, (current) => {
            // React mounts child effects first. Insert an initially open parent
            // beneath its already registered children, not above them.
            const childIndex = current.findIndex(
                (entry) => entry.parentId === id,
            );
            const next = [...current];
            next.splice(childIndex < 0 ? next.length : childIndex, 0, layer);
            return next;
        });
        return (): void => {
            store.set(overlayLayersAtom, (current) =>
                current.filter((entry) => entry.id !== id),
            );
            if (
                latest.current.returnFocus === false ||
                !(trigger instanceof HTMLElement)
            ) {
                return;
            }
            const revealedId = store.get(overlayLayersAtom).at(-1)?.id;
            // Let the revealed layer reactivate its focus trap before restoring
            // the trigger. Never steal focus from a newly opened replacement.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (
                        trigger.isConnected &&
                        store.get(overlayLayersAtom).at(-1)?.id === revealedId
                    ) {
                        trigger.focus({ preventScroll: true });
                    }
                });
            });
        };
    }, [activeKey, id, kind, opened, parentId, store]);
    const index = layers.findIndex((entry) => entry.id === id);
    return {
        id,
        isTopmost: layers.at(-1)?.id === id,
        zIndex: getOverlayZIndex(index),
    };
};

type OverlayEscapeProviderProps = Readonly<{ children: ReactNode }>;

const OverlayEscapeScope = ({
    children,
}: OverlayEscapeProviderProps): ReactElement => {
    const store = useStore();
    useLayoutEffect(() => {
        const handleEscape = (event: KeyboardEvent): void => {
            if (
                event.key !== 'Escape' ||
                event.isComposing ||
                event.defaultPrevented ||
                (event.target instanceof HTMLElement &&
                    event.target.getAttribute(
                        'data-mantine-stop-propagation',
                    ) === 'true')
            ) {
                return;
            }
            const topmost = store.get(overlayLayersAtom).at(-1);
            if (!topmost) {
                return;
            }
            // Install before Mantine's passive window listeners. Consume the
            // original event even if closing synchronously reveals another layer.
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!event.repeat) {
                topmost.onEscape();
            }
        };
        window.addEventListener('keydown', handleEscape, { capture: true });
        return (): void => {
            window.removeEventListener('keydown', handleEscape, {
                capture: true,
            });
        };
    }, [store]);
    return <EscapeScopeContext value>{children}</EscapeScopeContext>;
};

export const OverlayEscapeProvider = ({
    children,
}: OverlayEscapeProviderProps): ReactNode => {
    const hasScope = useContext(EscapeScopeContext);
    return hasScope ? (
        children
    ) : (
        <OverlayEscapeScope>{children}</OverlayEscapeScope>
    );
};
