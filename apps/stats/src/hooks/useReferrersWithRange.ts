import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getAudienceQueryParam} from '../views/Stats/components/AudienceSelect';
import {useGlobalData} from '../providers/GlobalDataProvider';
import {useReferrerHistory} from '@tryghost/admin-x-framework/api/referrers';

export const useReferrersWithRange = (range: number) => {
    const {audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    const searchParams: Record<string, string> = {
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        member_status: getAudienceQueryParam(audience)
    };

    if (timezone) {
        searchParams.timezone = timezone;
    }

    return useReferrerHistory({searchParams});
}; 