import React, {useEffect, useMemo} from 'react';
import {LucideIcon, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade';
import {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

interface NewsletterSelectProps {
    newsletters?: Newsletter[];
}

const NewsletterSelect: React.FC<NewsletterSelectProps> = ({newsletters}) => {
    const {selectedNewsletterId, setSelectedNewsletterId} = useGlobalData();

    // Filter only active newsletters
    const activeNewsletters = useMemo(() => {
        return newsletters?.filter(newsletter => newsletter.status === 'active') || [];
    }, [newsletters]);

    // Default to the default newsletter (sort_order = 1) when the component loads
    useEffect(() => {
        if (activeNewsletters.length > 0 && !selectedNewsletterId) {
            // First try to find the default newsletter (sort_order = 0)
            const defaultNewsletter = activeNewsletters.find(newsletter => newsletter.sort_order === 0);

            // If we found a default newsletter, use it
            if (defaultNewsletter) {
                setSelectedNewsletterId(defaultNewsletter.id);
            } else {
                // Otherwise fall back to the first active newsletter
                setSelectedNewsletterId(activeNewsletters[0].id);
            }
        }
    }, [activeNewsletters, selectedNewsletterId, setSelectedNewsletterId]);

    // Handle no newsletters case
    if (activeNewsletters.length <= 1) {
        return null;
    }

    return (
        <Select
            value={selectedNewsletterId || ''}
            onValueChange={(value) => {
                setSelectedNewsletterId(value);
            }}
        >
            <SelectTrigger>
                <LucideIcon.Mails className='mr-2' size={16} strokeWidth={1.5} />
                <SelectValue placeholder="Select a newsletter" />
            </SelectTrigger>
            <SelectContent align='end'>
                <SelectGroup>
                    <SelectLabel>Newsletters</SelectLabel>
                    {activeNewsletters.map(newsletter => (
                        <SelectItem key={newsletter.id} value={newsletter.id}>
                            {newsletter.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
};

export default NewsletterSelect;