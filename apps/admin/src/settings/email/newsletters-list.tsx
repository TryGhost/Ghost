import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, LoadingIndicator, NoValueLabel, NoValueLabelIcon } from "@tryghost/shade/components";
import { LucideIcon, cn, formatNumber } from "@tryghost/shade/utils";
import { useNavigate } from "@tryghost/admin-x-framework";
import type { Newsletter } from "@tryghost/admin-x-framework/api/newsletters";

/**
 * The newsletters table, ported from the legacy newsletters-list.tsx: rows
 * open the routed detail dialog, active rows drag-reorder (dnd-kit, replacing
 * the old-DS SortableList), archived rows are static.
 */

interface NewslettersListProps {
    newsletters: Newsletter[];
    isLoading: boolean;
    isSortable?: boolean;
    onSort?: (activeId: string, overId?: string) => void | Promise<void>;
}

function NewsletterRowContent({ newsletter, onOpen }: { newsletter: Newsletter; onOpen: () => void }) {
    return (
        <>
            <div className="grow cursor-pointer py-3 pr-6" onClick={onOpen}>
                <div className="flex grow flex-col">
                    <span className="font-medium">{newsletter.name}</span>
                    <span className="mt-0.5 text-sm leading-tight text-muted-foreground">{newsletter.description || "No description"}</span>
                </div>
            </div>
            <div className="hidden cursor-pointer py-3 pr-6 md:block md:min-w-[11rem]" onClick={onOpen}>
                <div className="flex grow flex-col">
                    <span>{formatNumber(newsletter.count?.active_members || 0)}</span>
                    <span className="mt-0.5 text-sm leading-tight whitespace-nowrap text-muted-foreground">Subscribers</span>
                </div>
            </div>
            <div className="hidden cursor-pointer py-3 pr-6 md:block md:min-w-[11rem]" onClick={onOpen}>
                <div className="flex grow flex-col">
                    <span>{formatNumber(newsletter.count?.posts || 0)}</span>
                    <span className="mt-0.5 text-sm leading-tight whitespace-nowrap text-muted-foreground">Delivered</span>
                </div>
            </div>
        </>
    );
}

function NewsletterRow({ newsletter, sortable }: { newsletter: Newsletter; sortable?: boolean }) {
    const navigate = useNavigate();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: newsletter.id,
        disabled: !sortable,
    });

    const onOpen = () => navigate(`/settings/newsletters/${newsletter.id}`);

    return (
        <div
            ref={sortable ? setNodeRef : undefined}
            className={cn("group flex w-full items-center border-b border-border bg-background last:border-b-0", isDragging && "opacity-75")}
            style={sortable ? { transform: CSS.Transform.toString(transform), transition } : undefined}
        >
            {sortable && (
                <button
                    aria-label="Reorder newsletter"
                    className="w-10 shrink-0 cursor-grab opacity-0 group-hover:opacity-100"
                    type="button"
                    {...attributes}
                    {...listeners}
                >
                    <LucideIcon.GripVertical className="mx-auto size-4 text-muted-foreground" />
                </button>
            )}
            <NewsletterRowContent newsletter={newsletter} onOpen={onOpen} />
            <div className="shrink-0 py-3">
                <Button className="px-0 font-semibold text-state-success hover:bg-transparent hover:opacity-80" data-testid="edit-newsletter-button" variant="ghost" onClick={onOpen}>
                    Edit
                </Button>
            </div>
        </div>
    );
}

export function NewslettersList({ newsletters, isLoading, isSortable, onSort }: NewslettersListProps) {
    if (isLoading) {
        return <div className="flex justify-center py-8"><LoadingIndicator size="md" /></div>;
    }

    if (!newsletters.length) {
        return (
            <NoValueLabel>
                <NoValueLabelIcon><LucideIcon.MailX /></NoValueLabelIcon>
                No newsletters found.
            </NoValueLabel>
        );
    }

    if (isSortable) {
        return (
            <DndContext
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                    if (event.active.id) {
                        void onSort?.(event.active.id as string, event.over?.id as string | undefined);
                    }
                }}
            >
                <SortableContext items={newsletters.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                    <div>
                        {newsletters.map((newsletter) => (
                            <NewsletterRow key={newsletter.id} newsletter={newsletter} sortable />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        );
    }

    return (
        <div>
            {newsletters.map((newsletter) => (
                <NewsletterRow key={newsletter.id} newsletter={newsletter} />
            ))}
        </div>
    );
}
