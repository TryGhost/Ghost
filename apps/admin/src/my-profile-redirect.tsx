import {Navigate} from "@tryghost/admin-x-framework";
import {useCurrentUser} from "@tryghost/admin-x-framework/api/current-user";

const MyProfileRedirect = () => {
    const {data: currentUser} = useCurrentUser();

    if (!currentUser) {
        return null;
    }

    return <Navigate replace to={`/settings/staff/${currentUser.slug}`} />;
};

export default MyProfileRedirect;
