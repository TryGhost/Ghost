import React, { useEffect, useMemo } from 'react';
import { useShade } from '@tryghost/shade/app';
import { LucideIcon } from '@tryghost/shade/utils';
import { type Newsletter } from '@tryghost/admin-x-framework/api/newsletters';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { useAnalytics } from '@/analytics/providers/analytics-context';

interface NewsletterSelectProps {
  newsletters?: Newsletter[];
}

const NewsletterSelect: React.FC<NewsletterSelectProps> = ({ newsletters }) => {
  const { controlShape } = useShade();
  const { selectedNewsletterId, setSelectedNewsletterId } = useAnalytics();

  // Filter only active newsletters
  const activeNewsletters = useMemo(() => {
    return newsletters?.filter((newsletter) => newsletter.status === 'active') || [];
  }, [newsletters]);

  // Default to the default newsletter (sort_order = 1) when the component loads
  useEffect(() => {
    if (activeNewsletters.length > 0 && !selectedNewsletterId) {
      // First try to find the default newsletter (sort_order = 0)
      const defaultNewsletter = activeNewsletters.find((newsletter) => newsletter.sort_order === 0);

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
    <Tooltip>
      <Select
        value={selectedNewsletterId || ''}
        onValueChange={(value) => {
          setSelectedNewsletterId(value);
        }}
      >
        <TooltipTrigger asChild>
          <SelectTrigger
            aria-label="Newsletter"
            className="w-auto"
            shape={controlShape}
            showChevron={controlShape === 'pill' ? false : undefined}
            variant={controlShape === 'pill' ? 'ghost' : 'default'}
          >
            <LucideIcon.Mails
              className="mr-2"
              size={16}
              strokeWidth={controlShape === 'pill' ? 2 : 1.5}
            />
            <SelectValue placeholder="Select a newsletter" />
          </SelectTrigger>
        </TooltipTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectLabel>Newsletters</SelectLabel>
            {activeNewsletters.map((newsletter) => (
              <SelectItem key={newsletter.id} value={newsletter.id}>
                {newsletter.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <TooltipContent side="bottom" variant="white">
        Newsletter
      </TooltipContent>
    </Tooltip>
  );
};

export default NewsletterSelect;
