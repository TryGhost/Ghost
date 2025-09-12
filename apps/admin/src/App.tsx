import { Outlet } from '@tryghost/admin-x-framework'
import { useCurrentUser } from '@tryghost/admin-x-framework/api/currentUser'
import { EmberProvider, EmberFallback, EmberRoot, EmberAuthSync } from './ember-bridge'
import { AdminLayout } from './layout/AdminLayout.tsx'

function App() {
    const { data: currentUser } = useCurrentUser()
    const needsAuthentication = !currentUser

    return (
        <EmberProvider>
            {needsAuthentication ? (
                <EmberFallback />
            ) : (
                <AdminLayout>
                    <Outlet />
                </AdminLayout>
            )}
            <EmberRoot />
            <EmberAuthSync />
        </EmberProvider>
    )
}

export default App
