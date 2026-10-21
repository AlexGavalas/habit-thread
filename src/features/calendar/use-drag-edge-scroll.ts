import { type EmblaCarouselType } from 'embla-carousel';
import { useEffect, useState } from 'react';

type DragScrollApi = Pick<
    EmblaCarouselType,
    'rootNode' | 'scrollTo' | 'selectedScrollSnap'
>;

const EDGE_WIDTH = 48;
const SCROLL_DELAY = 600;

type EdgeDirection = -1 | 0 | 1;

export const getDragEdgeDirection = (
    bounds: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
    point: Readonly<{ x: number; y: number }>,
): EdgeDirection => {
    if (
        point.x < bounds.left ||
        point.x > bounds.right ||
        point.y < bounds.top ||
        point.y > bounds.bottom
    ) {
        return 0;
    }
    if (point.x <= bounds.left + EDGE_WIDTH) {
        return -1;
    }
    if (point.x >= bounds.right - EDGE_WIDTH) {
        return 1;
    }
    return 0;
};

export const useDragEdgeScroll = (
    api: DragScrollApi | null,
    isDragging: boolean,
    lastSlide: number,
): EdgeDirection => {
    const [activeEdge, setActiveEdge] = useState<EdgeDirection>(0);
    useEffect(() => {
        if (!api || !isDragging || lastSlide === 0) {
            return;
        }

        let direction: EdgeDirection = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const stopScrolling = (): void => {
            clearTimeout(timer);
            timer = undefined;
            direction = 0;
            setActiveEdge(0);
        };
        const scroll = (): void => {
            const current = api.selectedScrollSnap();
            const next = Math.max(0, Math.min(current + direction, lastSlide));
            if (!direction || next === current) {
                stopScrolling();
                return;
            }
            api.scrollTo(next);
            if (next === 0 || next === lastSlide) {
                stopScrolling();
                return;
            }
            timer = setTimeout(scroll, SCROLL_DELAY);
        };
        const handleDragOver = (event: DragEvent): void => {
            const nextDirection = getDragEdgeDirection(
                api.rootNode().getBoundingClientRect(),
                { x: event.clientX, y: event.clientY },
            );
            const current = api.selectedScrollSnap();
            if (
                !nextDirection ||
                (nextDirection === -1 && current === 0) ||
                (nextDirection === 1 && current === lastSlide)
            ) {
                stopScrolling();
                return;
            }
            event.preventDefault();
            if (nextDirection !== direction) {
                stopScrolling();
                direction = nextDirection;
                setActiveEdge(nextDirection);
                timer = setTimeout(scroll, SCROLL_DELAY);
            }
        };
        const handleWindowLeave = (event: DragEvent): void => {
            if (
                !event.relatedTarget &&
                (event.target === document.documentElement ||
                    event.target === document.body)
            ) {
                stopScrolling();
            }
        };

        // Native drag events keep firing while the pointer is held still.
        // Reuse one timer per edge, rather than resetting it on every event.
        document.addEventListener('dragenter', handleDragOver);
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('dragleave', handleWindowLeave);
        document.addEventListener('drop', stopScrolling, true);
        window.addEventListener('dragend', stopScrolling, true);
        window.addEventListener('blur', stopScrolling);
        return (): void => {
            stopScrolling();
            document.removeEventListener('dragenter', handleDragOver);
            document.removeEventListener('dragover', handleDragOver);
            document.removeEventListener('dragleave', handleWindowLeave);
            document.removeEventListener('drop', stopScrolling, true);
            window.removeEventListener('dragend', stopScrolling, true);
            window.removeEventListener('blur', stopScrolling);
        };
    }, [api, isDragging, lastSlide]);

    return isDragging && lastSlide > 0 ? activeEdge : 0;
};
