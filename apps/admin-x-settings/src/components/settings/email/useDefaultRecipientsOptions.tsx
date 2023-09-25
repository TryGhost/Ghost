import useFilterableApi from '../../../hooks/useFilterableApi';
import {GroupBase, MultiValue} from 'react-select';
import {Label} from '../../../api/labels';
import {LoadOptions, MultiSelectOption} from '../../../admin-x-ds/global/form/MultiSelect';
import {Offer} from '../../../api/offers';
import {Tier} from '../../../api/tiers';
import {debounce} from '../../../utils/debounce';
import {isObjectId} from '../../../utils/helpers';
import {useEffect, useState} from 'react';

const SIMPLE_SEGMENT_OPTIONS: MultiSelectOption[] = [{
    label: 'Free members',
    value: 'status:free',
    color: 'green'
}, {
    label: 'Paid members',
    value: 'status:-free',
    color: 'pink'
}];

const useDefaultRecipientsOptions = (selectedOption: string, defaultEmailRecipientsFilter?: string | null) => {
    const tiers = useFilterableApi<Tier, 'tiers', 'name'>({path: '/tiers/', filterKey: 'name', responseKey: 'tiers'});
    const labels = useFilterableApi<Label, 'labels', 'name'>({path: '/labels/', filterKey: 'name', responseKey: 'labels'});
    const offers = useFilterableApi<Offer, 'offers', 'name'>({path: '/offers/', filterKey: 'name', responseKey: 'offers'});

    const [selectedSegments, setSelectedSegments] = useState<MultiValue<MultiSelectOption> | null>(null);

    const tierOption = (tier: Tier): MultiSelectOption => ({value: tier.id, label: tier.name, color: 'black'});
    const labelOption = (label: Label): MultiSelectOption => ({value: `label:${label.slug}`, label: label.name, color: 'grey'});
    const offerOption = (offer: Offer): MultiSelectOption => ({value: `offer_redemptions:${offer.id}`, label: offer.name, color: 'black'});

    const loadOptions: LoadOptions = async (input, callback) => {
        const [tiersData, labelsData, offersData] = await Promise.all([tiers.loadData(input), labels.loadData(input), offers.loadData(input)]);

        const segmentOptionGroups: GroupBase<MultiSelectOption>[] = [
            {
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
        const tierIds: string[] = [], labelIds: string[] = [], offerIds: string[] = [];

        for (const filter of filters) {
            if (filter.startsWith('label:')) {
                labelIds.push(filter.replace('label:', ''));
            } else if (filter.startsWith('offer_redemptions:')) {
                offerIds.push(filter.replace('offer_redemptions:', ''));
            } else if (isObjectId(filter)) {
                tierIds.push(filter);
            }
        }

        const options = await Promise.all([
            tiers.loadInitialValues(tierIds).then(data => data.map(tierOption)),
            labels.loadInitialValues(labelIds).then(data => data.map(labelOption)),
            offers.loadInitialValues(offerIds).then(data => data.map(offerOption))
        ]).then(results => results.flat());

        setSelectedSegments(filters.map(filter => options.find(option => option.value === filter)!));
    };

    useEffect(() => {
        if (selectedOption === 'segment') {
            loadOptions('', () => {});
        }
    }, [selectedOption]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        loadOptions: debounce(loadOptions, 500),
        selectedSegments,
        setSelectedSegments
    };
};

export default useDefaultRecipientsOptions;
