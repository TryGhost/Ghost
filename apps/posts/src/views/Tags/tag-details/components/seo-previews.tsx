function truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.substring(0, maxLength).trim()}…`;
}

export function SearchEnginePreview({title, description, url}: {
    title: string;
    description: string;
    url: string;
}) {
    return (
        <div>
            <p className="mb-2 text-sm font-medium">Search Engine Result Preview</p>
            <div className="rounded-md border p-4">
                <div className="truncate text-xs text-muted-foreground">{truncate(url, 70)}</div>
                <div className="mt-1 text-base text-[#1a0dab]">{truncate(title, 70)}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                    {description
                        ? truncate(description, 156)
                        : 'Search engines will automatically show a custom preview of content related to the search term here if no custom meta description is set.'}
                </div>
            </div>
        </div>
    );
}

export function SocialCardPreview({network, image, title, description, domain}: {
    network: 'x' | 'facebook';
    image: string;
    title: string;
    description: string;
    domain: string;
}) {
    return (
        <div>
            <p className="mb-2 text-sm font-medium">{network === 'x' ? 'X preview' : 'Facebook preview'}</p>
            <div className="overflow-hidden rounded-md border">
                {image && <img alt="" className="aspect-[1.91/1] w-full object-cover" src={image} />}
                <div className="p-3">
                    <div className="text-xs text-muted-foreground uppercase">{domain}</div>
                    <div className="mt-1 text-sm font-semibold">{truncate(title, 100)}</div>
                    {description && <div className="mt-1 text-sm text-muted-foreground">{truncate(description, 125)}</div>}
                </div>
            </div>
        </div>
    );
}
