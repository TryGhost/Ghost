import {ALL_AUDIENCES, getAudienceQueryParam} from '@views/Stats/components/audience-select';
import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {useTopSourcesGrowth as useTopSourcesGrowthAPI} from '@tryghost/admin-x-framework/api/referrers';

export const useTopSourcesGrowth = (range: number, orderBy: string = 'signups desc', limit: number = 50) => {
    const {startDate, endDate, timezone} = getRangeDates(range);

    const searchParams: Record<string, string> = {
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        member_status: getAudienceQueryParam(ALL_AUDIENCES),
        order: orderBy,
        limit: limit.toString()
    };

    if (timezone) {
        searchParams.timezone = timezone;
    }

    return useTopSourcesGrowthAPI({searchParams});
};
