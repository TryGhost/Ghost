import React from "react";
import TagsHeader from "./components/TagsHeader";
import TagsContent from "./components/TagsContent";
import TagsLayout from "./components/TagsLayout";
import { useLocation } from "@tryghost/admin-x-framework"
import TagsList from "./components/TagsList";
import { useBrowseTags } from "@tryghost/admin-x-framework/api/tags";

const Tags: React.FC = () => {
    const { search } = useLocation();
    const qs = new URLSearchParams(search);
    const type = qs.get("type") ?? "public";

    const { data, isLoading } = useBrowseTags({
        searchParams: {
            type
        }
    });

    return (
        <TagsLayout>
            <TagsHeader currentTab={type} />
            <TagsContent>
                <TagsList items={data?.tags ?? []} />
            </TagsContent>
        </TagsLayout>
    );
};

export default Tags;
