import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@tryghost/shade/components";

/** The Offers → current trail shown in the offer preview toolbars (the legacy SettingsBreadcrumbs). */
export function OffersBreadcrumbs({ current, onBack }: { current: string; onBack: () => void }) {
    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <button className="cursor-pointer" type="button" onClick={onBack}>Offers</button>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage className="max-w-[320px] truncate">{current}</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
}
