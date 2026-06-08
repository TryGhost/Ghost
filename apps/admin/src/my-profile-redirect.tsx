import {Navigate} from "@tryghost/admin-x-framework";
import {useCurrentUser} from "@tryghost/admin-x-framework/api/current-user";

const MyProfileRedirect = () => {
    const {data: currentUser, isError, isLoading} = useCurrentUser();

    if (!currentUser) {
        if (isError || !isLoading) {
            return <Navigate replace to="/" />;
        }

        return null;
    }

    return <Navigate replace to={`/settings/staff/${currentUser.slug}`} />;
};

export default MyProfileRedirect;
