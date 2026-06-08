// Mock ResizeObserver
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Import any other required setup 