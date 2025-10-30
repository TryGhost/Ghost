import EditProfile from './EditProfile';
import React, {useState} from 'react';
import {Account} from '@src/api/activitypub';
import {Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, H4, LucideIcon, cn} from '@tryghost/shade';
import {Link} from '@tryghost/admin-x-framework';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';

interface SettingsProps {
    account?: Account;
    className?: string;
}

const Settings: React.FC<SettingsProps> = ({account, className = ''}) => {
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const navigate = useNavigateWithBasePath();

    return (
        <div className={`flex flex-col ${className}`}>
            <SettingSeparator />
            <SettingItem>
                <SettingHeader>
                    <SettingTitle>Account</SettingTitle>
                    <SettingDescription>
                        Edit your profile information and account details
                    </SettingDescription>
                </SettingHeader>
                <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                    <DialogTrigger>
                        <SettingAction><Button variant='secondary'>Edit profile</Button></SettingAction>
                    </DialogTrigger>
                    <DialogContent onOpenAutoFocus={e => e.preventDefault()}>
                        <DialogHeader>
                            <DialogTitle>Profile settings</DialogTitle>
                        </DialogHeader>
                        {account && <EditProfile account={account} setIsEditingProfile={setIsEditingProfile} />}
                    </DialogContent>
                </Dialog>
            </SettingItem>
            <SettingItem withHover onClick={() => navigate('/preferences/moderation')}>
                <SettingHeader>
                    <SettingTitle>Moderation</SettingTitle>
                    <SettingDescription>Manage blocked users and domains</SettingDescription>
                </SettingHeader>
                <SettingAction className='flex items-center gap-2'>
                    <LucideIcon.ChevronRight size={20} />
                </SettingAction>
            </SettingItem>
            <SettingItem withHover onClick={() => navigate('/preferences/bluesky-sharing')}>
                <SettingHeader>
                    <SettingTitle>Bluesky sharing</SettingTitle>
                    <SettingDescription>Share content directly on Bluesky</SettingDescription>
                </SettingHeader>
                <SettingAction className='flex items-center gap-2'>
                    {account?.blueskyEnabled ? <span className='font-medium text-black'>On</span> : <span>Off</span>}
                    <LucideIcon.ChevronRight size={20} />
                </SettingAction>
            </SettingItem>
            <SettingSeparator />
            <SettingItem href='https://ghost.org/help/social-web/' withHover>
                <SettingHeader>
                    <SettingTitle>Help</SettingTitle>
                    <SettingDescription>Social web guides and support resources</SettingDescription>
                </SettingHeader>
                <SettingAction><LucideIcon.ExternalLink size={18} /></SettingAction>
            </SettingItem>
        </div>
    );
};

const SettingTitle = H4;

interface SettingDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

const SettingDescription: React.FC<SettingDescriptionProps> = ({children, className = ''}) => {
    return (
        <span className={`text-sm text-gray-700 ${className}`}>
            {children}
        </span>
    );
};

interface SettingHeaderProps {
    children: React.ReactNode;
    className?: string;
}

const SettingHeader: React.FC<SettingHeaderProps> = ({children, className = ''}) => {
    return (
        <div className={`relative flex flex-col gap-0.5 ${className}`}>
            {children}
        </div>
    );
};

interface SettingActionProps {
    children: React.ReactNode;
    className?: string;
}

export const SettingAction: React.FC<SettingActionProps> = ({children, className = ''}) => {
    return (
        <div className={`relative text-gray-500 ${className}`}>
            {children}
        </div>
    );
};

interface SettingItemProps {
    children: React.ReactNode;
    className?: string;
    withHover?: boolean;
    to?: string;
    href?: string;
    onClick?: () => void;
}

const SettingItem: React.FC<SettingItemProps> = ({children, className = '', withHover = false, to, href, onClick}) => {
    const baseClasses = 'flex items-center justify-between py-3 gap-4';
    const hoverClasses = withHover ? 'relative cursor-pointer before:absolute before:inset-x-[-16px] before:inset-y-[-1px] before:rounded-md before:bg-gray-50 before:opacity-0 before:transition-opacity before:will-change-[opacity] hover:z-10 hover:cursor-pointer hover:border-b-transparent hover:before:opacity-100 dark:before:bg-gray-950' : '';
    const itemClasses = cn(baseClasses, hoverClasses, className);

    if (to) {
        return (
            <Link
                className={itemClasses}
                to={to}
            >
                {children}
            </Link>
        );
    }

    if (href) {
        return (
            <a
                className={itemClasses}
                href={href}
                rel='noreferrer'
                target='_blank'
            >
                {children}
            </a>
        );
    }

    if (onClick) {
        return (
            <div
                className={itemClasses}
                role="button"
                tabIndex={0}
                onClick={onClick}
            >
                {children}
            </div>
        );
    }

    return (
        <div className={itemClasses}>
            {children}
        </div>
    );
};

const SettingSeparator: React.FC = () => {
    return (
        <hr className='my-3 h-px border-0 bg-gray-200 dark:bg-gray-950' />
    );
};

export default Settings;
