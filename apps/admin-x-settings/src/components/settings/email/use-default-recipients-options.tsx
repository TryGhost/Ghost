import {type Label} from '@tryghost/admin-x-framework/api/labels';
import {type Offer} from '@tryghost/admin-x-framework/api/offers';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';
import {debounce} from '../../../utils/debounce';
import {isObjectId} from '../../../utils/helpers';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useFilterableApi} from '@tryghost/admin-x-framework/hooks';

export interface SegmentOption {
    label: string;
    value: string;
}

export interface SegmentOptionGroup {
    label: string;
    options: SegmentOption[];
}

export type SegmentOptions = Array<SegmentOption | SegmentOptionGroup>;

const SIMPLE_SEGMENT_OPTIONS: SegmentOption[] = [{
    label: 'Free members',
    value: 'status:free'
}, {
    label: 'Paid members',
    value: 'status:-free'
}];

const useDefaultRecipientsOptions = (selectedOption: string, defaultEmailRecipientsFilter?: string | null) => {
    const tiers = useFilterableApi<Tier, 'tiers', 'name'>({path: '/tiers/', filterKey: 'name', responseKey: 'tiers'});
    const labels = useFilterableApi<Label, 'labels', 'name'>({path: '/labels/', filterKey: 'name', responseKey: 'labels'});
    const offers = useFilterableApi<Offer, 'offers', 'name'>({path: '/offers/', filterKey: 'name', responseKey: 'offers'});

    const [selectedSegments, setSelectedSegments] = useState<SegmentOption[] | null>(null);

    const tierOption = (tier: Tier): SegmentOption => ({value: tier.id, label: tier.name});
    const labelOption = (label: Label): SegmentOption => ({value: `label:${label.slug}`, label: label.name});
    const offerOption = (offer: Offer): SegmentOption => ({value: `offer_redemptions:${offer.id}`, label: offer.name});

    const loadOptions = async (input: string, callback: (options: SegmentOptions) => void) => {
        const [tiersData, labelsData, offersData] = await Promise.all([tiers.loadData(input), labels.loadData(input), offers.loadData(input)]);

        const segmentOptionGroups: SegmentOptionGroup[] = [
            {
                label: 'Member status',
                options: SIMPLE_SEGMENT_OPTIONS.filter(({label}) => label.toLowerCase().includes(input.toLowerCase()))
            },
            {
                label: 'Active Tiers',
                options: tiersData.filter(({active, type}) => active && type !== 'free').map(tierOption) || []
            },
            {
                label: 'Archived Tiers',
                options: tiersData.filter(({active}) => !active).map(tierOption) || []
            },
            {
                label: 'Labels',
                options: labelsData.map(labelOption) || []
            },
            {
                label: 'Offers',
                options: offersData.map(offerOption) || []
            }
        ];

        if (selectedSegments === null) {
            initSelectedSegments();
        }

        callback(segmentOptionGroups.filter(group => group.options.length > 0));
    };

    const initSelectedSegments = async () => {
        const filters = defaultEmailRecipientsFilter?.split(',') || [];
        const tierIds: string[] = [], labelSlugs: string[] = [], offerIds: string[] = [];

        for (const filter of filters) {
            if (filter.startsWith('label:')) {
                labelSlugs.push(filter.replace('label:', ''));
            } else if (filter.startsWith('offer_redemptions:')) {
                offerIds.push(filter.replace('offer_redemptions:', ''));
            } else if (isObjectId(filter)) {
                tierIds.push(filter);
            }
        }

        const options = await Promise.all([
            tiers.loadInitialValues(tierIds, 'id').then(data => data.map(tierOption)),
            labels.loadInitialValues(labelSlugs, 'slug').then(data => data.map(labelOption)),
            offers.loadInitialValues(offerIds, 'id').then(data => data.map(offerOption))
        ]).then(results => [...SIMPLE_SEGMENT_OPTIONS, ...results.flat()]);

        setSelectedSegments(filters.map(filter => options.find(option => option.value === filter)).filter(option => option !== undefined));
    };
    const loadOptionsRef = useRef(loadOptions);
    loadOptionsRef.current = loadOptions;
    const debouncedLoadOptions = useMemo(() => debounce((input: string, callback: (options: SegmentOptions) => void) => {
        void loadOptionsRef.current(input, callback);
    }, 500), []);

    useEffect(() => {
        if (selectedOption === 'segment') {
            loadOptions('', () => {});
        }
    }, [selectedOption]);  

    return {
        loadOptions: debouncedLoadOptions,
        selectedSegments,
        setSelectedSegments
    };
};

export default useDefaultRecipientsOptions;
