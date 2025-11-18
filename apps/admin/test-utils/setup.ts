import "@testing-library/jest-dom";
import { expect } from "vitest";
import matchers from "jest-extended";

expect.extend(matchers);

// Setup mocks for shade components
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {}, // deprecated
        removeListener: () => {}, // deprecated
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {}
    })
});

// Mock ResizeObserver - required for charts and responsive components
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock
});

// Mock getBoundingClientRect - required for positioning calculations
Element.prototype.getBoundingClientRect = () => ({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: () => {}
});
