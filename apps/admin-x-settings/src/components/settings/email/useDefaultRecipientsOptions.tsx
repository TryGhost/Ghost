import {GroupBase, MultiValue} from 'react-select';
import {Label, LabelsResponseType} from '../../../api/labels';
import {LoadOptions, MultiSelectOption} from '../../../admin-x-ds/global/form/MultiSelect';
import {Offer, OffersResponseType} from '../../../api/offers';
import {Tier, TiersResponseType} from '../../../api/tiers';
import {apiUrl, useFetchApi} from '../../../utils/apiRequests';
import {debounce} from '../../../utils/debounce';
import {useEffect, useRef, useState} from 'react';

const escapeNqlString = (value: string) => {
    return '\'' + value.replace(/'/g, '\\\'') + '\'';
};

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
    const fetchApi = useFetchApi();
    const responses = useRef<{
        tiers?: { data: Tier[]; allLoaded: boolean };
        labels?: { data: Label[]; allLoaded: boolean };
        offers?: { data: Offer[]; allLoaded: boolean };
    }>({});

    const [selectedSegments, setSelectedSegments] = useState<MultiValue<MultiSelectOption> | null>(null);

    const loadTiers = async (input: string) => {
        if (responses.current.tiers?.allLoaded) {
            return responses.current.tiers.data.filter(tier => tier.name.toLowerCase().includes(input.toLowerCase()));
        }

        const response = await fetchApi<TiersResponseType>(apiUrl('/tiers/', {
            filter: input ? `name:~${escapeNqlString(input)}` : '',
            limit: '20'
        }));

        responses.current.tiers = {
            data: response.tiers,
            allLoaded: !input && !response.meta?.pagination.next
        };

        return response.tiers;
    };

    const loadLabels = async (input: string) => {
        if (responses.current.labels?.allLoaded) {
            return responses.current.labels.data.filter(tier => tier.name.toLowerCase().includes(input.toLowerCase()));
        }

        const response = await fetchApi<LabelsResponseType>(apiUrl('/labels/', {
            filter: input ? `name:~${escapeNqlString(input)}` : '',
            limit: '20'
        }));

        responses.current.labels = {
            data: response.labels,
            allLoaded: !input && !response.meta?.pagination.next
        };

        return response.labels;
    };

    const loadOffers = async (input: string) => {
        if (responses.current.offers?.allLoaded) {
            return responses.current.offers.data.filter(tier => tier.name.toLowerCase().includes(input.toLowerCase()));
        }

        const response = await fetchApi<OffersResponseType>(apiUrl('/offers/', {
            filter: input ? `name:~${escapeNqlString(input)}` : '',
            limit: '20'
        }));

        responses.current.offers = {
            data: response.offers,
            allLoaded: !input && !response.meta?.pagination.next
        };

        return response.offers;
    };

    const tierOption = (tier: Tier): MultiSelectOption => ({value: tier.id, label: tier.name, color: 'black'});
    const labelOption = (label: Label): MultiSelectOption => ({value: `label:${label.slug}`, label: label.name, color: 'grey'});
    const offerOption = (offer: Offer): MultiSelectOption => ({value: `offer_redemptions:${offer.id}`, label: offer.name, color: 'black'});

    const loadOptions: LoadOptions = async (input, callback) => {
        const [tiers, labels, offers] = await Promise.all([loadTiers(input), loadLabels(input), loadOffers(input)]);

        const segmentOptionGroups: GroupBase<MultiSelectOption>[] = [
            {
                options: SIMPLE_SEGMENT_OPTIONS.filter(({label}) => label.toLowerCase().includes(input.toLowerCase()))
            },
            {
                label: 'Active Tiers',
                options: tiers?.filter(({active, type}) => active && type !== 'free').map(tierOption) || []
            },
            {
                label: 'Archived Tiers',
                options: tiers?.filter(({active}) => !active).map(tierOption) || []
            },
            {
                label: 'Labels',
                options: labels?.map(labelOption) || []
            },
            {
                label: 'Offers',
                options: offers?.map(offerOption) || []
            }
        ];

        if (selectedSegments === null) {
            initSelectedSegments(segmentOptionGroups.flatMap(({options}) => options));
        }

        callback(segmentOptionGroups.filter(group => group.options.length > 0));
    };

    const loadSpecificTierOptions = async (ids: string[]) => {
        if (!ids.length) {
            return [];
        }

        const response = await fetchApi<TiersResponseType>(apiUrl('/tiers/', {
            filter: `id:[${ids.join(',')}]`,
            limit: 'all'
        }));

        return response.tiers.map(tierOption);
    };

    const loadSpecificLabelOptions = async (ids: string[]) => {
        if (!ids.length) {
            return [];
        }

        const response = await fetchApi<LabelsResponseType>(apiUrl('/labels/', {
            filter: `id:[${ids.join(',')}]`,
            limit: 'all'
        }));

        return response.labels.map(labelOption);
    };

    const loadSpecificOfferOptions = async (ids: string[]) => {
        if (!ids.length) {
            return [];
        }

        const response = await fetchApi<OffersResponseType>(apiUrl('/offers/', {
            filter: `id:[${ids.join(',')}]`,
            limit: 'all'
        }));

        return response.offers.map(offerOption);
    };

    const initSelectedSegments = async (options: MultiSelectOption[]) => {
        const filters = defaultEmailRecipientsFilter?.split(',') || [];
        const missingParts = filters.filter(filter => !options.some(option => option.value === filter));

        const missingTiers: string[] = [], missingLabels: string[] = [], missingOffers: string[] = [];

        for (const filter of missingParts) {
            if (filter.startsWith('label:')) {
                missingLabels.push(filter.replace('label:', ''));
            } else if (filter.startsWith('offer_redemptions:')) {
                missingOffers.push(filter.replace('offer_redemptions:', ''));
            } else {
                missingTiers.push(filter);
            }
        }

        const newOptions = await Promise.all([
            loadSpecificTierOptions(missingTiers),
            loadSpecificLabelOptions(missingLabels),
            loadSpecificOfferOptions(missingOffers)
        ]).then(results => results.flat());

        setSelectedSegments(filters.map(filter => (
            options.find(option => option.value === filter) ||
            newOptions.find(option => option.value === filter)!
        )));
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
