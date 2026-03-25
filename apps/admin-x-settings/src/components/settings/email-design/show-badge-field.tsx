import React from 'react';
import {Heart} from 'lucide-react';
import {Switch} from '@tryghost/shade';

interface ShowBadgeFieldProps {
    value: boolean;
    onChange: (checked: boolean) => void;
}

const ShowBadgeField: React.FC<ShowBadgeFieldProps> = ({value, onChange}) => (
    <div className="mt-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
            <Heart className="mt-0.5 size-4 shrink-0 text-red-500" />
            <div className="flex flex-col gap-0.5">
                <span>Promote independent publishing</span>
                <span className="text-xs leading-tight text-muted-foreground">Show you&apos;re a part of the indie publishing movement with a small badge in the footer</span>
            </div>
        </div>
        <Switch
            checked={value}
            size='sm'
            onCheckedChange={onChange}
        />
    </div>
);

export default ShowBadgeField;
