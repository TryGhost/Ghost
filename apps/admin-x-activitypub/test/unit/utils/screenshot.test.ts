import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import html2canvas from 'html2canvas-objectfit-fix';

import {takeScreenshot} from '../../../src/utils/screenshot';

// Mock html2canvas
vi.mock('html2canvas-objectfit-fix');

// Mock DOM methods
Object.defineProperty(window, 'URL', {
    value: {
        createObjectURL: vi.fn(),
        revokeObjectURL: vi.fn()
    },
    writable: true
});

describe('takeScreenshot', function () {
    let mockElement: HTMLElement;
    let mockCanvas: HTMLCanvasElement;
    let mockBlob: Blob;

    beforeEach(function () {
        // Create mock element
        mockElement = document.createElement('div');

        // Create mock canvas
        mockCanvas = document.createElement('canvas');
        mockBlob = new Blob(['fake-image-data'], {type: 'image/png'});

        // Mock canvas.toBlob method
        mockCanvas.toBlob = vi.fn();

        // Mock html2canvas to return our mock canvas
        vi.mocked(html2canvas).mockResolvedValue(mockCanvas);

        // Mock URL methods
        vi.mocked(window.URL.createObjectURL).mockReturnValue('blob:fake-url');
        vi.mocked(window.URL.revokeObjectURL).mockImplementation(() => {});

        // Mock DOM methods
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'a') {
                const link = {
                    href: '',
                    download: '',
                    click: vi.fn()
                } as unknown as HTMLAnchorElement;
                return link;
            }
            return originalCreateElement(tagName);
        });

        vi.spyOn(document.body, 'appendChild').mockImplementation(() => undefined as unknown as Node);
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => undefined as unknown as Node);

        // Mock console.error
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(function () {
        vi.clearAllMocks();
    });

    it('calls html2canvas with correct default options', async function () {
        // Mock successful toBlob callback
        vi.mocked(mockCanvas.toBlob).mockImplementation((callback) => {
            callback(mockBlob);
        });

        await takeScreenshot(mockElement);

        expect(html2canvas).toHaveBeenCalledWith(mockElement, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            imageTimeout: 0
        });
    });

    it('calls html2canvas with custom options', async function () {
        // Mock successful toBlob callback
        vi.mocked(mockCanvas.toBlob).mockImplementation((callback) => {
            callback(mockBlob);
        });

        await takeScreenshot(mockElement, {
            scale: 3,
            backgroundColor: '#ffffff'
        });

        expect(html2canvas).toHaveBeenCalledWith(mockElement, {
            backgroundColor: '#ffffff',
            scale: 3,
            logging: false,
            useCORS: true,
            allowTaint: true,
            imageTimeout: 0
        });
    });

    it('creates anchor element and triggers download on successful blob creation', async function () {
        const mockLink = {
            href: '',
            download: '',
            click: vi.fn()
        };

        vi.mocked(document.createElement).mockReturnValue(mockLink as unknown as HTMLAnchorElement);
        vi.mocked(mockCanvas.toBlob).mockImplementation((callback) => {
            callback(mockBlob);
        });

        await takeScreenshot(mockElement, {filename: 'test-screenshot.png'});

        expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockLink.href).toBe('blob:fake-url');
        expect(mockLink.download).toBe('test-screenshot.png');
        expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
        expect(mockLink.click).toHaveBeenCalled();
        expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
        expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    });

    it('uses default filename when none provided', async function () {
        const mockLink = {
            href: '',
            download: '',
            click: vi.fn()
        };

        vi.mocked(document.createElement).mockReturnValue(mockLink as unknown as HTMLAnchorElement);
        vi.mocked(mockCanvas.toBlob).mockImplementation((callback) => {
            callback(mockBlob);
        });

        // Mock Date.now for consistent filename
        const mockNow = 1234567890;
        vi.spyOn(Date, 'now').mockReturnValue(mockNow);

        await takeScreenshot(mockElement);

        expect(mockLink.download).toBe('screenshot-1234567890.png');
    });

    it('logs error and throws when html2canvas throws exception', async function () {
        const error = new Error('html2canvas failed');
        vi.mocked(html2canvas).mockRejectedValue(error);

        await expect(takeScreenshot(mockElement)).rejects.toThrow('html2canvas failed');
        // eslint-disable-next-line no-console
        expect(console.error).toHaveBeenCalledWith('Failed to take screenshot:', error);
    });

    it('handles null blob from toBlob callback', async function () {
        vi.mocked(mockCanvas.toBlob).mockImplementation((callback) => {
            callback(null);
        });

        await expect(takeScreenshot(mockElement)).rejects.toThrow('Failed to create blob from canvas');
    });

    it('handles error during blob processing', async function () {
        const error = new Error('URL creation failed');
        vi.mocked(window.URL.createObjectURL).mockImplementation(() => {
            throw error;
        });

        vi.mocked(mockCanvas.toBlob).mockImplementation((callback) => {
            callback(mockBlob);
        });

        await expect(takeScreenshot(mockElement)).rejects.toThrow('URL creation failed');
    });

    it('handles error during DOM manipulation', async function () {
        const error = new Error('DOM manipulation failed');
        vi.mocked(document.body.appendChild).mockImplementation(() => {
            throw error;
        });

        vi.mocked(mockCanvas.toBlob).mockImplementation((callback) => {
            callback(mockBlob);
        });

        await expect(takeScreenshot(mockElement)).rejects.toThrow('DOM manipulation failed');
    });
});