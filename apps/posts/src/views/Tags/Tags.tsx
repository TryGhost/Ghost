import React from "react";
import TagsHeader from "./components/TagsHeader";
import TagsContent from "./components/TagsContent";
import TagsLayout from "./components/TagsLayout";
import { useLocation } from "@tryghost/admin-x-framework"

const Tags: React.FC = () => {
    const { search } = useLocation();
    const qs = new URLSearchParams(search);
    const type = qs.get("type") ?? "public";

    return (
        <TagsLayout>
            <TagsHeader currentTab={type} />
            <TagsContent />
        </TagsLayout>
    );
};

export default Tags;
