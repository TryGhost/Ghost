import {useState} from 'react';
import {Banner, LucideIcon} from '@tryghost/shade';
import {useActiveThemeErrors} from './hooks/use-theme-errors';
import ThemeErrorsDialog from './theme-errors-dialog';

function ThemeErrorsBanner() {
    const {hasErrors, errors, warnings} = useActiveThemeErrors();
    const [dialogOpen, setDialogOpen] = useState(false);

    if (!hasErrors) {
        return null;
    }

    return (
        <>
            <Banner
                className="mx-2 cursor-pointer"
                role="status"
                size="md"
                variant="destructive"
                onClick={() => setDialogOpen(true)}
            >
                <div className="flex items-start gap-3">
                    <LucideIcon.AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
                    <div>
                        <div className="font-semibold text-red-900">Your theme has errors</div>
                        <div className="text-xs text-red-700">Some functionality on your site may be limited &rarr;</div>
                    </div>
                </div>
            </Banner>
            <ThemeErrorsDialog
                errors={errors}
                open={dialogOpen}
                warnings={warnings}
                onOpenChange={setDialogOpen}
            />
        </>
    );
}

export default ThemeErrorsBanner;
