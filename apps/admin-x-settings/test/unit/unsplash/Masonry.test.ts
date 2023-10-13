import MasonryService from '../../../src/unsplash/masonry/MasonryService';
import {Photo} from '../../../src/unsplash/UnsplashTypes';
import {fixturePhotos} from '../../../src/unsplash/api/unsplashFixtures';

describe('MasonryService', () => {
    let service: MasonryService;
    let mockPhotos: Photo[];

    beforeEach(() => {
        service = new MasonryService(3);
        mockPhotos = fixturePhotos;
    });

    it('should initialize with default column count', () => {
        expect(service.columnCount).toEqual(3);
    });

    describe('reset', () => {
        it('should reset columns and columnHeights', () => {
            service.reset();
            expect(service.columns.length).toEqual(3);
            expect(service.columnHeights!.length).toEqual(3);
        });
    });

    describe('addPhotoToColumns', () => {
        it('should add photo to columns with the minimum height)', () => {
            service.reset();
            service.addPhotoToColumns(mockPhotos[0]);
            expect(service.columns![0]).toContain(mockPhotos[0]);
        });
    });

    describe('getColumns', () => {
        it('should return the columns', () => {
            service.reset();
            const columns = service.getColumns();
            expect(columns).toEqual(service.columns);
        });
    });

    describe('changeColumnCount', () => {
        it('should change the column count and reset', () => {
            service.changeColumnCount(4);
            expect(service.columnCount).toEqual(4);
            expect(service.columns.length).toEqual(4);
            expect(service.columnHeights!.length).toEqual(4);
        });

        it('should not reset if the column count is not changed', () => {
            const prevColumns = service.getColumns();
            service.changeColumnCount(3);
            expect(service.getColumns()).toEqual(prevColumns);
        });
    });
});
