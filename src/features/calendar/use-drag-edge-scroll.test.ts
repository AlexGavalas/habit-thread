import { act, cleanup, renderHook } from '~test/utils';

import {
    getDragEdgeDirection,
    useDragEdgeScroll,
} from './use-drag-edge-scroll';

const bounds = new DOMRect(100, 100, 1000, 600);
const dispatchDragOver = (x: number, y = 300): void => {
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
        clientX: { value: x },
        clientY: { value: y },
    });
    document.dispatchEvent(event);
};

describe('drag edge directions', () => {
    it.each([
        { direction: -1, x: 120, y: 300 },
        { direction: 1, x: 1080, y: 300 },
        { direction: 0, x: 600, y: 300 },
        { direction: 0, x: 99, y: 300 },
        { direction: 0, x: 1101, y: 300 },
        { direction: 0, x: 1080, y: 99 },
        { direction: 0, x: 1080, y: 701 },
    ])('detects $direction at ($x, $y)', ({ direction, x, y }) => {
        expect(getDragEdgeDirection(bounds, { x, y })).toBe(direction);
    });
});

describe('useDragEdgeScroll', () => {
    const node = document.createElement('div');
    const selection = { index: 0 };
    const scrollTo = jest.fn((index: number) => {
        selection.index = index;
    });
    const api = {
        rootNode: (): HTMLElement => node,
        scrollTo,
        selectedScrollSnap: (): number => selection.index,
    };

    beforeEach(() => {
        jest.useFakeTimers();
        selection.index = 0;
        jest.spyOn(node, 'getBoundingClientRect').mockReturnValue(bounds);
    });
    afterEach(() => {
        cleanup();
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('waits before scrolling, repeats at the edge, and stops at the last day', () => {
        const { result } = renderHook(() => useDragEdgeScroll(api, true, 3));
        act(() => {
            dispatchDragOver(1080);
            jest.advanceTimersByTime(599);
        });
        expect({
            calls: scrollTo.mock.calls,
            edge: result.current,
        }).toStrictEqual({
            calls: [],
            edge: 1,
        });
        act(() => {
            // Frequent dragover events must not restart the dwell timer.
            dispatchDragOver(1080);
            jest.advanceTimersByTime(1);
        });
        expect(scrollTo.mock.calls).toStrictEqual([[1]]);
        act(() => {
            jest.advanceTimersByTime(2400);
        });
        expect({
            calls: scrollTo.mock.calls,
            edge: result.current,
        }).toStrictEqual({
            calls: [[1], [2], [3]],
            edge: 0,
        });
    });

    it('changes direction with a fresh delay and does not scroll before the first day', () => {
        selection.index = 1;
        renderHook(() => {
            useDragEdgeScroll(api, true, 3);
        });
        act(() => {
            dispatchDragOver(1080);
            jest.advanceTimersByTime(300);
            dispatchDragOver(120);
            jest.advanceTimersByTime(599);
        });
        expect(scrollTo).not.toHaveBeenCalled();
        act(() => {
            jest.advanceTimersByTime(1201);
        });
        expect(scrollTo.mock.calls).toStrictEqual([[0]]);
    });

    it('starts dwelling on edge entry without requiring another pointer movement', () => {
        renderHook(() => {
            useDragEdgeScroll(api, true, 3);
        });
        act(() => {
            document.dispatchEvent(
                new MouseEvent('dragenter', {
                    bubbles: true,
                    clientX: 1080,
                    clientY: 300,
                }),
            );
            jest.advanceTimersByTime(600);
        });
        expect(scrollTo.mock.calls).toStrictEqual([[1]]);
    });

    it.each([
        { description: 'the center', x: 600, y: 300 },
        { description: 'outside the board', x: 1080, y: 701 },
    ])('stops when the pointer moves to $description', ({ x, y }) => {
        renderHook(() => {
            useDragEdgeScroll(api, true, 3);
        });
        act(() => {
            dispatchDragOver(1080);
            jest.advanceTimersByTime(300);
            dispatchDragOver(x, y);
            jest.advanceTimersByTime(2000);
        });
        expect(scrollTo).not.toHaveBeenCalled();
    });

    it.each(['drop', 'dragend', 'blur'])('stops on %s', (eventName) => {
        renderHook(() => {
            useDragEdgeScroll(api, true, 3);
        });
        act(() => {
            dispatchDragOver(1080);
            document.dispatchEvent(new Event(eventName, { bubbles: true }));
            jest.advanceTimersByTime(2000);
        });
        expect(scrollTo).not.toHaveBeenCalled();
    });

    it('cleans up on cancellation and unmount', () => {
        const { rerender, unmount } = renderHook(
            (isDragging) => {
                useDragEdgeScroll(api, isDragging, 3);
            },
            { initialProps: true },
        );
        act(() => {
            dispatchDragOver(1080);
        });
        rerender(false);
        act(() => {
            jest.advanceTimersByTime(2000);
        });
        expect(scrollTo).not.toHaveBeenCalled();
        rerender(true);
        act(() => {
            dispatchDragOver(1080);
        });
        unmount();
        act(() => {
            jest.advanceTimersByTime(2000);
        });
        expect(scrollTo).not.toHaveBeenCalled();
    });

    it('ignores external drags and calendars with no hidden days', () => {
        const { rerender } = renderHook(
            ({ isDragging, lastSlide }) => {
                useDragEdgeScroll(api, isDragging, lastSlide);
            },
            { initialProps: { isDragging: false, lastSlide: 3 } },
        );
        act(() => {
            dispatchDragOver(1080);
            jest.advanceTimersByTime(2000);
        });
        rerender({ isDragging: true, lastSlide: 0 });
        act(() => {
            dispatchDragOver(1080);
            jest.advanceTimersByTime(2000);
        });
        expect(scrollTo).not.toHaveBeenCalled();
    });
});
