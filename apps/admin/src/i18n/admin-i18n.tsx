import {createContext, type ReactNode, useContext, useEffect, useMemo, useState} from 'react';

export const ADMIN_LOCALES = ['en', 'sv'] as const;
export type AdminLocale = typeof ADMIN_LOCALES[number];

const englishMessages = {
        analytics: 'Analytics',
        appearance: 'Appearance',
        automations: 'Automations',
        comments: 'Comments',
        createNewPost: 'Create new post',
        dark: 'Dark',
        drafts: 'Drafts',
        help: 'Help',
        language: 'Language',
        languageEnglish: 'English',
        languageSwedish: 'Swedish',
        light: 'Light',
        members: 'Members',
        network: 'Network',
        openAccessSettings: 'Open access settings',
        pageNotFound: 'Page not found',
        pages: 'Pages',
        posts: 'Posts',
        private: 'Private',
        published: 'Published',
        resourcesAndGuides: 'Resources & guides',
        scheduled: 'Scheduled',
        searchSite: 'Search site',
        settings: 'Settings',
        signOut: 'Sign out',
        siteIcon: 'Site icon',
        system: 'System',
        tags: 'Tags',
        toggleMemberViews: 'Toggle member views',
        togglePostViews: 'Toggle post views',
        toggleSidebar: 'Toggle sidebar',
        userMenu: 'User menu',
        viewSite: 'View site',
        viewSiteNewTab: 'View site in new tab',
        whatsNew: 'What\'s new?',
        yourProfile: 'Your profile'
} as const;

type AdminMessages = Record<keyof typeof englishMessages, string>;

const messages = {
    en: englishMessages,
    sv: {
        analytics: 'Analys',
        appearance: 'Utseende',
        automations: 'Automatiseringar',
        comments: 'Kommentarer',
        createNewPost: 'Skapa nytt inlägg',
        dark: 'Mörkt',
        drafts: 'Utkast',
        help: 'Hjälp',
        language: 'Språk',
        languageEnglish: 'Engelska',
        languageSwedish: 'Svenska',
        light: 'Ljust',
        members: 'Medlemmar',
        network: 'Nätverk',
        openAccessSettings: 'Öppna åtkomstinställningar',
        pageNotFound: 'Sidan kunde inte hittas',
        pages: 'Sidor',
        posts: 'Inlägg',
        private: 'Privat',
        published: 'Publicerade',
        resourcesAndGuides: 'Resurser och guider',
        scheduled: 'Schemalagda',
        searchSite: 'Sök på webbplatsen',
        settings: 'Inställningar',
        signOut: 'Logga ut',
        siteIcon: 'Webbplatsikon',
        system: 'System',
        tags: 'Taggar',
        toggleMemberViews: 'Växla medlemsvyer',
        togglePostViews: 'Växla inläggsvyer',
        toggleSidebar: 'Växla sidofält',
        userMenu: 'Användarmeny',
        viewSite: 'Visa webbplats',
        viewSiteNewTab: 'Visa webbplats i ny flik',
        whatsNew: 'Vad är nytt?',
        yourProfile: 'Din profil'
    }
} satisfies Record<AdminLocale, AdminMessages>;

export type AdminMessageKey = keyof typeof englishMessages;

const STORAGE_KEY = 'ghost:admin:locale';

function isAdminLocale(value: string | null): value is AdminLocale {
    return value !== null && ADMIN_LOCALES.includes(value as AdminLocale);
}

export function resolveAdminLocale(languages: readonly string[] = []): AdminLocale {
    return languages.some(language => language.toLowerCase().startsWith('sv')) ? 'sv' : 'en';
}

interface AdminI18nContextValue {
    locale: AdminLocale;
    setLocale: (locale: AdminLocale) => void;
    t: (key: AdminMessageKey) => string;
}

const AdminI18nContext = createContext<AdminI18nContextValue | null>(null);

export function AdminI18nProvider({children}: {children: ReactNode}) {
    const [locale, setLocale] = useState<AdminLocale>(() => {
        if (typeof window === 'undefined') {
            return 'en';
        }

        const savedLocale = window.localStorage.getItem(STORAGE_KEY);
        return isAdminLocale(savedLocale) ? savedLocale : resolveAdminLocale(navigator.languages);
    });

    useEffect(() => {
        document.documentElement.lang = locale;
        window.localStorage.setItem(STORAGE_KEY, locale);
    }, [locale]);

    const value = useMemo<AdminI18nContextValue>(() => ({
        locale,
        setLocale,
        t: key => messages[locale][key]
    }), [locale]);

    return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export function useAdminTranslation() {
    const context = useContext(AdminI18nContext);
    if (!context) {
        throw new Error('useAdminTranslation must be used within AdminI18nProvider');
    }
    return context;
}
