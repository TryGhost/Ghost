import "@testing-library/jest-dom";
import { expect } from "vitest";
import matchers from "jest-extended";
import { setupShadeMocks } from "@tryghost/admin-x-framework/test/setup";

expect.extend(matchers);

setupShadeMocks();

// jsdom doesn't implement ResizeObserver, which Recharts (used by the analytics
// views) relies on. Provide a no-op mock for all admin tests.
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

global.ResizeObserver = global.ResizeObserver ?? (ResizeObserverMock);
