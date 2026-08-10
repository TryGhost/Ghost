import {faker} from "@faker-js/faker";
import {createBuilder} from "../factory";
import {generateId, generateSlug, generateUuid} from "../utils";

/** Ghost Admin API newsletter resource. */
export interface Newsletter {
    id: string;
    uuid: string;
    name: string;
    description: string | null;
    feedback_enabled: boolean;
    slug: string;
    sender_name: string | null;
    sender_email: string | null;
    sender_reply_to: string;
    status: "active" | "archived";
    visibility: "members" | "paid";
    subscribe_on_signup: boolean;
    sort_order: number;
    header_image: string | null;
    show_header_icon: boolean;
    show_header_title: boolean;
    title_font_category: "serif" | "sans_serif";
    title_font_weight: "normal" | "medium" | "semibold" | "bold";
    title_alignment: "left" | "center";
    show_excerpt: boolean;
    show_feature_image: boolean;
    body_font_category: "serif" | "sans_serif";
    footer_content: string | null;
    show_badge: boolean;
    show_header_name: boolean;
    show_post_title_section: boolean;
    show_comment_cta: boolean;
    show_share_button: boolean;
    show_subscription_details: boolean;
    show_latest_posts: boolean;
    background_color: string;
    header_background_color: string;
    button_color: string | null;
    link_color: string | null;
    post_title_color: string | null;
    section_title_color: string | null;
    divider_color: string | null;
    button_corners: string | null;
    button_style: string | null;
    image_corners: string | null;
    link_style: string | null;
    divider_style: string | null;
    created_at: string;
    updated_at: string;
    count: {
        posts: number;
        active_members: number;
    };
}

export const newsletter = createBuilder<Newsletter>(() => {
    const now = new Date().toISOString();
    const name = `${faker.word.adjective()} newsletter`;

    return {
        id: generateId(),
        uuid: generateUuid(),
        name,
        description: null,
        feedback_enabled: true,
        slug: `${generateSlug(name)}-${faker.string.alphanumeric(6).toLowerCase()}`,
        sender_name: "Sender",
        sender_email: null,
        sender_reply_to: "support",
        status: "active",
        visibility: "members",
        subscribe_on_signup: true,
        sort_order: 0,
        header_image: null,
        show_header_icon: true,
        show_header_title: true,
        title_font_category: "serif",
        title_font_weight: "bold",
        title_alignment: "center",
        show_excerpt: true,
        show_feature_image: true,
        body_font_category: "serif",
        footer_content: "",
        show_badge: false,
        show_header_name: true,
        show_post_title_section: true,
        show_comment_cta: true,
        show_share_button: false,
        show_subscription_details: false,
        show_latest_posts: false,
        background_color: "light",
        header_background_color: "transparent",
        button_color: null,
        link_color: null,
        post_title_color: null,
        section_title_color: null,
        divider_color: null,
        button_corners: null,
        button_style: "fill",
        image_corners: null,
        link_style: null,
        divider_style: null,
        created_at: now,
        updated_at: now,
        count: {
            posts: 0,
            active_members: 0
        }
    };
});
