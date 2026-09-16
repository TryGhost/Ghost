import { Navigate } from '@tryghost/admin-x-framework';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';

const MyProfileRedirect = () => {
  const { data: currentUser, isError, isLoading } = useCurrentUser();

  if (!currentUser) {
    if (isError || !isLoading) {
      return <Navigate to="/" replace />;
    }

    return null;
  }

  return <Navigate to={`/settings/staff/${currentUser.slug}`} replace />;
};

export default MyProfileRedirect;
