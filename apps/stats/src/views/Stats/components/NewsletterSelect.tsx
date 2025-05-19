import React, {useEffect, useMemo} from 'react';
import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

const NewsletterSelect: React.FC = () => {
    const {selectedNewsletterId, setSelectedNewsletterId} = useGlobalData();
    const {data: {newsletters} = {}} = useBrowseNewsletters();

    // Filter only active newsletters
    const activeNewsletters = useMemo(() => {
        return newsletters?.filter(newsletter => newsletter.status === 'active') || [];
    }, [newsletters]);

    // Default to the first active newsletter when the component loads or when activeNewsletters changes
    useEffect(() => {
        if (activeNewsletters.length > 0 && !selectedNewsletterId) {
            // You could look for a "primary" flag here if available
            // For now, select the first active newsletter
            setSelectedNewsletterId(activeNewsletters[0].id);
        }
    }, [activeNewsletters, selectedNewsletterId, setSelectedNewsletterId]);

    // Handle no newsletters case
    if (!activeNewsletters.length) {
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