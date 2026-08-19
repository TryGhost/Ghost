import React, {useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, EmptyIndicator, HoverCard, HoverCardContent, HoverCardTrigger, Popover, PopoverClose, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {toast} from 'sonner';
import {useBlocker} from 'react-router';
import {useConfirmUnload, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {getScenario, mockAutomations} from '@/automations/proto/shared/mock';
import {type ChangeEntry, changeSummary} from './change-summary';
import {EDITING_MODEL_SLOT} from './editing-model';
import {HEADER_SLOT} from './header-model';
import {TRIGGER_CARD_SLOT} from './trigger-card-model';
import {UnpublishedChangesDialog} from './unpublished-changes-dialog';
import {HeaderBar} from './header-bar';
import {LEFT_PANEL_SLOT, leftPanelComponent} from './panel-variants';
import {ProtoVariantSwitcher, ProtoVariantsProvider} from '@/automations/proto/shared/proto-variant-switcher';
import {StatusBadge} from '@/automations/proto/shared/status-badge';
import {DEFAULT_TRIGGER_CONFIG, type TriggerConfig} from '@/automations/proto/shared/trigger-config';
import {useProtoVariant} from '@/automations/proto/shared/proto-variants';
import {CANVAS_SURFACE} from '@/automations/proto/surface/flow-utils';
import {SurfaceEditCanvas as FloatEditCanvas} from '@/automations/proto/surface/edit-canvas';
import {SurfaceFlowCanvas as FloatFlowCanvas} from '@/automations/proto/surface/flow-canvas';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

type LiveStatus = 'active' | 'inactive';
type SaveState = 'saved' | 'saving';

// Every control in this screen's floating chrome sits directly on the canvas, and
// Shade's outline variant is bg-transparent — the dot grid reads straight through
// it, so the button looks like a hole rather than a thing. An opaque surface is
// all that's needed; no shadow, because no button in Ghost carries one. Elevation
// here is the border plus the fact that it's opaque over a textured canvas.
const FLOATING_CONTROL = 'bg-surface-elevated';

// One rail button. `active` highlights it while its flyout is open. forwardRef
// is required (not optional) whenever one of these is a Radix trigger with
// `asChild`, which clones its child and attaches a ref — a plain function
// component would silently drop it. Kept even though no rail button is currently
// a trigger: the ⋯ menu that was is coming back.
interface RailButtonProps extends React.ComponentPropsWithoutRef<'button'> {
    icon: React.ElementType;
    label: string;
    active?: boolean;
}

// `...rest` is essential for the same case: Radix clones the trigger and injects
// the handlers that actually open the menu (onPointerDown/onKeyDown) plus
// aria-*/data-state. Forwarding only the ref isn't enough — those props must be
// spread onto the real <Button> too.
const RailButton = React.forwardRef<HTMLButtonElement, RailButtonProps>(({icon: Icon, label, active, ...rest}, ref) => (
    <Button
        ref={ref}
        aria-label={label}
        className={cn(active && 'bg-muted')}
        size="icon"
        variant="ghost"
        {...rest}
    >
        <Icon strokeWidth={2} />
    </Button>
));
RailButton.displayName = 'RailButton';

// Turn-on / turn-off confirmations. Structure and weight come from the shipped
// editor (plain AlertDialog, non-destructive confirm, same shape of sentence);
// the vocabulary is the proto's, and deliberately narrower than what's shipped.
//
// One switch metaphor owns the lifecycle — an automation is On or Off, and you
// Turn it on or off — which leaves "publish" to mean exactly one thing: pushing
// edits to an automation that's already on. The shipped build currently spends
// "Publish" on both, so turning one on and updating a running one read as the
// same act when they aren't.
const TurnOnAutomationDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}> = ({open, onOpenChange, onConfirm}) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Turn on automation?</AlertDialogTitle>
                <AlertDialogDescription>
                    Your automation will start running. Any member who meets the trigger will be enrolled automatically.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={onConfirm}>Turn on</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

const TurnOffAutomationDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}> = ({open, onOpenChange, onConfirm}) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Turn off automation?</AlertDialogTitle>
                <AlertDialogDescription>
                    Your automation will no longer run, and any members currently in progress will be removed.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={onConfirm}>Turn off</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

// Publishing to an automation that's ON confirms — but only confirms. What happens to
// members already mid-flow is a real question the team still has to settle, and
// offering a choice here would imply we'd answered it. A plain "are you sure"
// marks the moment as deliberate without encoding a decision that doesn't exist
// yet; options go back in when there's something to encode.
const PublishChangesDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}> = ({open, onOpenChange, onConfirm}) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Publish changes</AlertDialogTitle>
                <AlertDialogDescription>
                    This automation is on — these changes will take effect immediately.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={onConfirm}>Publish</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

// The unpublished-changes control. One button standing in for what used to be
// several: it reports that a draft exists, says what's in it, and holds both ways
// of resolving it. Putting Discard and Publish together — behind a deliberate
// click, next to the list of what they'd act on — means neither is a stray click
// away in the header, and the header keeps its stable lifecycle action instead.
const UnpublishedChanges: React.FC<{
    changes: ChangeEntry[];
    onDiscard: () => void;
    onPublish: () => void;
}> = ({changes, onDiscard, onPublish}) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button className={FLOATING_CONTROL} variant="outline">
                <LucideIcon.TriangleAlert className="text-yellow-600 dark:text-yellow" />
                Unpublished changes
            </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
            {/* The title sits outside the scroll area so it stays put while a long
                list moves under it — and it's what makes the list legible: bare
                bullets left you to infer that they were the diff. */}
            <Stack className="p-5 pb-3" gap="sm">
                <Text size="lg" weight="semibold">Publish these changes?</Text>
            </Stack>
            {/* Plain bulleted list rather than one of Shade's list components:
                ActionList divides rows and hovers them, DataList pairs a label with a
                value and a bar — both would say these entries are interactive or
                measurable, and they're neither. They're a static description of a
                diff, so they stay a stack of bullets. */}
            <Stack className="max-h-72 overflow-y-auto px-5 pb-5" gap="sm">
                {changes.length === 0 ? (
                    // Reachable while an edit is mid-flight, or if something changed
                    // that this summary doesn't know how to describe.
                    <Text size="sm" tone="secondary">This draft differs from what’s live.</Text>
                ) : changes.map(change => (
                    <Inline key={change.id} align="start" className="text-sm" gap="sm">
                        <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                        <span>{change.label}</span>
                    </Inline>
                ))}
            </Stack>
            {/* Both close the popover: discard would leave it hovering over a list it
                just emptied, and publish opens a confirm dialog it would sit behind.
                Discard's undo lives in the toast it raises.

                Bare verbs — the title above already establishes what they act on, so
                repeating "changes" on both buttons only made them longer.

                No divider: the title asks a question and the buttons answer it, so
                ruling a line between them would split one exchange in two. The
                padding is what separates them from the list. */}
            <div className="flex gap-2 p-5 pt-0">
                <PopoverClose asChild>
                    <Button className="flex-1" type="button" variant="outline" onClick={onDiscard}>
                        Discard
                    </Button>
                </PopoverClose>
                <PopoverClose asChild>
                    <Button className="flex-1" type="button" onClick={onPublish}>
                        Publish
                    </Button>
                </PopoverClose>
            </div>
        </PopoverContent>
    </Popover>
);

/**
 * Float concept. All chrome floats directly on the canvas, the way the post
 * editor floats its own header over the document.
 *
 * Lifecycle: an automation is On or Off, and you Turn it on or off. Editing is
 * never gated on turning it off — edits autosave into a draft, and Publishing is
 * what pushes them to an automation that's already on. "Publish" therefore means
 * exactly one thing here, which is the whole reason the lifecycle uses a switch
 * metaphor instead of spending the same word on both.
 *
 * (An earlier version of this concept made a live automation read-only and used
 * Stop to unlock editing — the product VP wasn't bought into forcing that, so
 * the draft/published split does that job instead.)
 *
 * Reuses the surface concept's canvases directly (SurfaceEditCanvas /
 * SurfaceFlowCanvas) — the canvas itself isn't part of what "float" changes.
 */
const AutomationFloat: React.FC = () => {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const toVersioned = useVersionLink();

    const scenario = id ? getScenario(id) : undefined;

    // The Overview + Runs card is always docked now (no toolbar toggles), so the
    // only view state left is whether we're editing the flow. Editing is entered
    // from the header and only when stopped.
    const [editing, setEditing] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [liveStatus, setLiveStatus] = useState<LiveStatus>(scenario?.automation.status ?? 'active');
    const [dirty, setDirty] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('saved');
    const [stopOpen, setStopOpen] = useState(false);
    const [startOpen, setStartOpen] = useState(false);
    const [publishOpen, setPublishOpen] = useState(false);
    // Edits autosave into `draft`; `publishedDraft` is what the automation is
    // actually running. Publishing promotes one to the other — the same draft vs
    // published split posts already have, and what lets a live automation be
    // edited safely without stopping it first.
    const [draft, setDraft] = useState<AutomationDetail | null>(null);
    const [publishedDraft, setPublishedDraft] = useState<AutomationDetail | null>(null);
    // Trigger + exit criteria. Separate from `draft` because AutomationDetail carries no
    // trigger config yet — the canvases take it as its own prop.
    const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER_CONFIG);
    const [publishedTriggerConfig, setPublishedTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER_CONFIG);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    // The left pane's search expands into this screen's top strip, where it would
    // otherwise run into the automation title. The pane tells us when that happens.
    const [paneSearchOpen, setPaneSearchOpen] = useState(false);

    // Which left-panel variation is active (flask switcher, bottom-right).
    const LeftPanel = leftPanelComponent(useProtoVariant(LEFT_PANEL_SLOT));
    // Whether editing is a mode you enter, or just how the canvas always behaves.
    const alwaysEditable = useProtoVariant(EDITING_MODEL_SLOT) === 'always';
    // Floating chrome over the canvas, or a docked full-width header above it.
    // 'banner' is the docked bar too — it differs in where the unpublished-changes
    // state lives, not in the chrome's shape.
    const headerVariant = useProtoVariant(HEADER_SLOT);
    const dockedHeader = headerVariant === 'bar' || headerVariant === 'banner';
    const changesBanner = headerVariant === 'banner';
    // Phase-1 concept: the trigger card renders locked (see trigger-card-model).
    const triggerLocked = useProtoVariant(TRIGGER_CARD_SLOT) === 'locked';
    // Only meaningful when there's no edit mode to hide the pane for you.
    const [paneCollapsed, setPaneCollapsed] = useState(false);

    // Only a running automation has something to diverge FROM. Edits to a stopped
    // one aren't "unpublished" — there's no live version they're failing to reach,
    // so the draft simply is the automation, and Start is what takes it live.
    const hasUnpublishedChanges = dirty && liveStatus === 'active';

    // Leaving with unpublished changes. Autosave means the work itself is safe, so
    // the browser prompt is reserved for the one window where it genuinely isn't:
    // an autosave still in flight. Navigating away inside the app is a different
    // risk — the changes are saved but aren't running — so that gets a dialog that
    // says exactly that, rather than threatening data loss it can't cause.
    useConfirmUnload(saveState === 'saving');
    const navigationBlocker = useBlocker(({currentLocation, nextLocation}) => hasUnpublishedChanges && currentLocation.pathname !== nextLocation.pathname);

    const goBack = () => navigate(toVersioned('/automations-proto/float'));

    if (!scenario) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
                <EmptyIndicator title="Automation not found" />
                <Button variant="outline" onClick={goBack}>Back to automations</Button>
            </div>
        );
    }

    const {automation} = scenario;
    const selectedRun = selectedMemberId ? scenario.runs.find(r => r.id === selectedMemberId) ?? null : null;
    // Editing is never gated on stopping the automation — you can edit a live one
    // freely; publishing is where the consequences get decided.
    //
    // With no edit mode, the canvas is editable unless a member's run is in focus —
    // reviewing what happened to someone is the one thing that genuinely wants a
    // read-only view. The existing crossfade between the two canvases handles that
    // unchanged; only the condition driving it differs.
    const showEditCanvas = alwaysEditable ? !selectedRun : editing;
    // What hides the pane: the mode, or the user.
    const paneHidden = alwaysEditable ? paneCollapsed : showEditCanvas;
    // What's running (read canvas) vs what's being edited (edit canvas).
    const publishedAutomation = publishedDraft ?? automation;
    const activeDraft = draft ?? publishedAutomation;

    // Any edit marks the automation dirty and runs the fake autosave tick.
    const markEdited = () => {
        setDirty(true);
        setSaveState('saving');
        window.setTimeout(() => setSaveState('saved'), 700);
    };

    const handleDraftChange = (next: AutomationDetail) => {
        setDraft(next);
        markEdited();
    };

    const handleTriggerConfigChange = (next: TriggerConfig) => {
        setTriggerConfig(next);
        markEdited();
    };

    // Start — take a stopped automation live. Read mode only now, so there's no
    // edit state to settle here. No confirm dialog: going live is low-friction and
    // reversible via Stop, and a blocking modal would interrupt the flow. All the
    // friction lives on Stop and on publishing to something already running.
    // Whatever's in the draft becomes the running version.
    const promoteDraft = () => {
        setPublishedDraft(activeDraft);
        setPublishedTriggerConfig(triggerConfig);
        setDraft(null);
        setDirty(false);
    };

    const handleStart = () => {
        // Starting takes the automation live as it currently stands, so the draft
        // becomes the published version in the same move — there's no separate
        // "publish" step to remember for something that was never running.
        setStartOpen(false);
        promoteDraft();
        setLiveStatus('active');
        // Title only — the start-confirmation dialog already explained what
        // turning it on means, so the toast just confirms it happened.
        toast.success('Automation is on');
    };

    const publishChanges = () => {
        setPublishOpen(false);
        promoteDraft();
        toast.success('Changes published');
    };

    // A stopped automation has nobody mid-flow, so there's nothing to confirm and
    // it publishes straight away. A live one confirms first.
    const handlePublishClick = () => {
        if (liveStatus === 'inactive') {
            publishChanges();
            return;
        }
        setPublishOpen(true);
    };

    // Discard reverts to what's published. An undo toast rather than a confirm
    // dialog, matching the shipped header's discard.
    const handleDiscard = () => {
        const previousDraft = draft;
        const previousTriggerConfig = triggerConfig;
        setDraft(null);
        setTriggerConfig(publishedTriggerConfig);
        setDirty(false);
        toast('Changes discarded', {
            action: {
                label: 'Undo',
                onClick: () => {
                    setDraft(previousDraft);
                    setTriggerConfig(previousTriggerConfig);
                    setDirty(true);
                }
            }
        });
    };

    const handleStop = () => {
        setStopOpen(false);
        setLiveStatus('inactive');
    };

    // Only while the pane is actually on screen — entering edit mode hides the pane
    // (and its search) but the title stays put.
    const titleHidden = paneSearchOpen && !paneHidden;

    // Autosave still runs, so this reports the publish state, not the save state:
    // the only thing worth flagging is work that isn't live yet. Nothing to say
    // when everything is published.
    // No save indicator. Autosave is meant to be unremarkable, and flickering
    // "Saving…" on every keystroke draws the eye to plumbing rather than to
    // anything the publisher can act on. `saveState` still exists — it's what tells
    // the browser prompt that a write is genuinely in flight — it just isn't shown.
    //
    // Without an edit mode the "Unpublished changes" button already reports that
    // state, so saying it in text as well would be saying it twice.
    const indicatorText = !alwaysEditable && hasUnpublishedChanges ? 'Unpublished changes' : null;

    // What's in the draft that isn't live. Cheap enough to derive per render, and
    // only while there's actually something to describe.
    const changes = hasUnpublishedChanges
        ? changeSummary({
            published: publishedAutomation,
            draft: activeDraft,
            publishedTrigger: publishedTriggerConfig,
            draftTrigger: triggerConfig
        })
        : [];

    // The chrome's actions, built once and placed by whichever header variant is
    // active — floating in the canvas's top-right corner, or in the docked bar's
    // right zone. Both editing models are covered here, so switching header style
    // can't quietly change what the screen lets you do.
    //
    // FLOATING_CONTROL only applies when they're actually floating: in the bar
    // they sit on an opaque header already, and an extra surface there would read
    // as a nested panel.
    const outlineOnCanvas = dockedHeader ? undefined : FLOATING_CONTROL;
    const chromeActions = (
        <>
            {/* Without an edit mode the chrome holds the draft to settle, when there
                is one, and the lifecycle verb — the same Turn on / Turn off the other
                editing model uses.

                This briefly carried a combined status-and-action control instead: a
                green pill that reported On/Off and changed it. It collapsed two things
                into one, but the green read as decoration rather than as Ghost, and a
                tinted control floating on the canvas never got enough contrast to
                hold. Status went back to a badge beside the title, where the list page
                also puts it, and the action went back to naming itself. */}
            {alwaysEditable && (
                <>
                    {/* The alert opens the review; Publish is the action the state
                        calls for. Primary without competing: unpublished changes only
                        exist while the automation is live, so the lifecycle button
                        beside them is always the outline "Turn off". */}
                    {hasUnpublishedChanges && (changesBanner ? (
                        <>
                            <UnpublishedChangesDialog
                                changes={changes}
                                onDiscard={handleDiscard}
                                onPublish={publishChanges}
                            />
                            <Button onClick={handlePublishClick}>Publish changes</Button>
                        </>
                    ) : (
                        <UnpublishedChanges
                            changes={changes}
                            onDiscard={handleDiscard}
                            onPublish={handlePublishClick}
                        />
                    ))}
                    {liveStatus === 'inactive' ? (
                        <Button onClick={() => setStartOpen(true)}>Turn on</Button>
                    ) : (
                        <Button className={outlineOnCanvas} variant="outline" onClick={() => setStopOpen(true)}>Turn off</Button>
                    )}
                </>
            )}

            {/* Explicit edit mode keeps the draft actions in the chrome — except
                under the banner, which takes discard with it so the two editing
                models resolve a draft the same way. */}
            {!alwaysEditable && hasUnpublishedChanges && (
                <>
                    {!changesBanner && <Button className={outlineOnCanvas} variant="outline" onClick={handleDiscard}>Discard changes</Button>}
                    <Button onClick={handlePublishClick}>Publish changes</Button>
                </>
            )}

            {/* With one, edit mode carries only draft actions (Done here, since
                there's nothing outstanding), and the lifecycle actions live in
                read mode. */}
            {!hasUnpublishedChanges && !alwaysEditable && (
                showEditCanvas ? (
                    <Button className={outlineOnCanvas} variant="outline" onClick={() => setEditing(false)}>Done</Button>
                ) : (
                    <>
                        <Button className={outlineOnCanvas} variant="outline" onClick={() => setEditing(true)}>
                            <LucideIcon.Pencil /> Edit
                        </Button>
                        {/* Same reasoning as the always-editable branch above: Start is
                            the CTA, Stop is de-escalation. Kept identical so the two
                            editing models differ only in the thing being compared. */}
                        {liveStatus === 'inactive' ? (
                            <Button onClick={() => setStartOpen(true)}>Turn on</Button>
                        ) : (
                            <Button className={outlineOnCanvas} variant="outline" onClick={() => setStopOpen(true)}>Turn off</Button>
                        )}
                    </>
                )
            )}
        </>
    );

    return (
        // flex-col in both variants: the docked header is a row above the pane and
        // canvas, and with no header the same column collapses to just that row.
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background" data-testid="float-detail">
            {dockedHeader && (
                <HeaderBar
                    actions={chromeActions}
                    paneCollapsed={paneCollapsed}
                    status={liveStatus}
                    title={automation.name}
                    onBack={goBack}
                    onTogglePane={alwaysEditable ? () => setPaneCollapsed(!paneCollapsed) : undefined}
                />
            )}
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {/* Left pane docked flush to the edge. On entering edit it slides off the
                left (negative margin collapses its flex footprint to 0) and the canvas
                grows leftward to fill. Always mounted so the transition can animate; the
                canvas's ResizeObserver re-centres the flow as it grows. Clearing the
                title overlay is left to each panel variant — one keeps its content
                below it, another puts controls on the same baseline as it. */}
            {/* --surface-elevated, matching the right-hand analytics sheet: both are
                content panels flanking the canvas, so they're the same step of the
                ladder. This was on the --sidebar-* family, which is for the app's
                global nav — it happened to match in dark and diverged in light. */}
            <aside className={cn('relative flex w-[480px] shrink-0 flex-col overflow-hidden border-r border-border-default bg-surface-elevated transition-[margin] duration-150 ease-out', paneHidden ? '-ml-[480px]' : 'ml-0')}>
                <LeftPanel
                    headerDocked={dockedHeader}
                    scenario={scenario}
                    selectedMemberId={selectedMemberId}
                    onSearchOpenChange={setPaneSearchOpen}
                    onSelectMember={setSelectedMemberId}
                />
            </aside>

            {/* Canvas fills the remaining viewport (bounded, not full-bleed), so the flow
                centres within its own region — no left-inset hack needed. Same fill as
                REACT_FLOW_THEME paints inside it, so the region and the flow's own
                background can't disagree at the edges. */}
            <div className={cn('relative min-w-0 flex-1 overflow-hidden', CANVAS_SURFACE)}>
                {/* Both canvases stay mounted and crossfade on mode change. No remount
                    means the incoming flow is already centred — no first-frame node flash.
                    The inactive one is opacity-0 + pointer-events-none so clicks fall to
                    the active canvas beneath/above it. */}
                <div className={cn('absolute inset-0 transition-opacity duration-150', showEditCanvas ? 'pointer-events-none opacity-0' : 'opacity-100')}>
                    <FloatFlowCanvas automation={publishedAutomation} selectedRun={selectedRun} triggerConfig={publishedTriggerConfig} />
                </div>
                {/* Reviewing a member: the whole canvas takes an inset frame, stating
                    "you're inside this member's run" once at region scale instead of
                    leaving it to card states. grey-800 rather than a colour — the
                    frame marks a mode, not a status, and the blues/greens inside it
                    keep their meanings. (No semantic token this dark exists: muted
                    tops out at gray-100 and the next semantic stop is surface-inverse,
                    i.e. black — so the frame and its tab sit on the palette grey,
                    which stays near L53% in both modes.) An overlay rather than a
                    border on the region itself, so entering review doesn't shift the
                    canvas by the frame width (2px — 4px was tried and read heavy). */}
                {selectedRun && !showEditCanvas && (
                    <div className="pointer-events-none absolute inset-0 z-10 border-2 border-grey-800" />
                )}

                {/* Reviewing a member: their profile chip floats over the canvas, with
                    the way out built in. Selection was previously only reversible from
                    the list (click the row again) — nothing on the canvas said whose
                    run this was or offered an exit, so the mode read as sticky.

                    A profile (avatar + name + email), not a caption like "Ada's
                    progress": a caption narrates the mode in system voice, while
                    showing the member makes the canvas self-evidently their journey —
                    and it's the exact shape Ghost renders a member in everywhere else,
                    so it reads as a member pinned to the canvas rather than new
                    chrome. Same initials-avatar recipe as the newsletter feedback
                    list (stringToHslColor + initials fallback). */}
                {/* The way out of the run — a bare close floating in the canvas's
                    top-right. The frame plus the highlighted row carry "whose run
                    this is" on their own; a labelled tab was tried here (Figma's
                    following indicator, in miniature) and read as too much chrome
                    for the job. Docked header only: under floating chrome this
                    corner belongs to the lifecycle cluster, which appends the same
                    close instead. */}
                {dockedHeader && selectedRun && !showEditCanvas && (
                    <div className="absolute top-4 right-4 z-20">
                        <RailButton icon={LucideIcon.X} label="Close member view" onClick={() => setSelectedMemberId(null)} />
                    </div>
                )}

                <div className={cn('absolute inset-0 transition-opacity duration-150', showEditCanvas ? 'opacity-100' : 'pointer-events-none opacity-0')}>
                    <FloatEditCanvas draft={activeDraft} triggerConfig={triggerConfig} triggerLocked={triggerLocked} onChange={handleDraftChange} onTriggerConfigChange={handleTriggerConfigChange} />
                </div>

                {/* Top-right — autosave indicator (while editing), the
                    always-available Edit/Done toggle, then the primary lifecycle
                    action: Stop while live (high-friction confirm), Start once stopped.
                    Duplicate/Delete lived here behind a ⋯ menu; they're out of scope
                    for now and will come back once there's a decision to design. */}
                {!dockedHeader && (
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
                        {showEditCanvas && indicatorText && <span className="text-xs text-muted-foreground">{indicatorText}</span>}
                        {chromeActions}
                        {/* Reviewing a run: the way out, last so it sits at the
                            canvas's outer edge. */}
                        {selectedRun && !showEditCanvas && (
                            <RailButton icon={LucideIcon.X} label="Close member view" onClick={() => setSelectedMemberId(null)} />
                        )}
                    </div>
                )}
            </div>

            {/* Title — persistent overlay at the screen's top-left; stays put in edit
                mode even though the pane hides. pointer-events-none container so empty
                space passes clicks through; the title row opts back in. Floating
                variant only: the docked bar owns the title itself. */}
            {!dockedHeader && (
            <div className="pointer-events-none absolute top-4 left-4 z-30">
                {/* gap="none": every item here is a ghost button carrying its own
                    padding, so a gap on top of that spaced the cluster out twice. The
                    buttons sit flush and their padding does the separating, the way an
                    icon toolbar reads. */}
                <Inline align="center" className="pointer-events-auto" gap="none">
                    {/* The back arrow always stays — search indents past it rather than
                        covering it, so there's never a moment with no way out. Only the
                        title yields the space. */}
                    <RailButton icon={LucideIcon.ArrowLeft} label="Back to automations" onClick={goBack} />
                    {/* Mirrors the docked bar: one chart-glyph toggle beside the back
                        arrow, for both states — it names what it summons rather than
                        the mechanism of a sidebar. */}
                    {alwaysEditable && (
                        <RailButton
                            active={!paneCollapsed}
                            icon={LucideIcon.ChartNoAxesColumn}
                            label={paneCollapsed ? 'Show performance' : 'Hide performance'}
                            onClick={() => setPaneCollapsed(!paneCollapsed)}
                        />
                    )}
                    <HoverCard closeDelay={150} open={switcherOpen} openDelay={150} onOpenChange={setSwitcherOpen}>
                        <HoverCardTrigger asChild>
                            <Button
                                className={cn(
                                    // h-9 and the base rounded-md, so this sits in the same
                                    // button shape as the icon buttons beside it — it used
                                    // to be an auto-height pill, which read as a different
                                    // kind of control sitting in the same row.
                                    //
                                    // text-lg! (15px) — the `!` is required, not stylistic:
                                    // Button's base class sets text-control (13px), and
                                    // tailwind-merge can't tell that's a font size rather
                                    // than a colour, so it doesn't strip it. Without the
                                    // important, source order wins and the title silently
                                    // renders at 13px. Shade's own size variants do the
                                    // same thing.
                                    'h-9 min-w-0 px-2 text-lg! font-semibold transition-opacity',
                                    // Yields to the pane's search when it expands across
                                    // the strip. Faded out rather than unmounted so the
                                    // title doesn't pop back in as the input closes.
                                    titleHidden && 'pointer-events-none opacity-0'
                                )}
                                variant="ghost"
                            >
                                <span className="truncate">{automation.name}</span>
                                {/* Status reads beside the title in both editing models,
                                    which is where the list page puts it too — so the
                                    automation you opened is labelled the same way it was
                                    in the list. It's a plain badge, not a control: the
                                    lifecycle verb lives in the top-right corner. */}
                                <StatusBadge status={liveStatus} />
                            </Button>
                        </HoverCardTrigger>
                        <HoverCardContent align="start" className="max-h-80 w-64 overflow-y-auto p-1">
                            {mockAutomations.map(a => (
                                <Button
                                    key={a.id}
                                    className={cn(
                                        'w-full justify-between gap-3 px-2 py-1.5 font-normal',
                                        a.id === automation.id && 'bg-muted-foreground/10 font-medium'
                                    )}
                                    variant="ghost"
                                    onClick={() => {
                                        setSwitcherOpen(false);
                                        if (a.id !== automation.id) {
                                            navigate(toVersioned(`/automations-proto/float/${a.id}`));
                                        }
                                    }}
                                >
                                    <span className="truncate">{a.name}</span>
                                    <StatusBadge status={a.status} />
                                </Button>
                            ))}
                        </HoverCardContent>
                    </HoverCard>
                </Inline>
            </div>
            )}
            </div>

            {/* Lifecycle confirms — turning the automation on, and taking it off. */}
            <TurnOnAutomationDialog open={startOpen} onConfirm={handleStart} onOpenChange={setStartOpen} />
            <TurnOffAutomationDialog open={stopOpen} onConfirm={handleStop} onOpenChange={setStopOpen} />

            {/* Publish — a deliberate confirm when the automation is already live. */}
            <PublishChangesDialog open={publishOpen} onConfirm={publishChanges} onOpenChange={setPublishOpen} />

            {/* Leaving the automation with changes that are saved but not running.
                Not a data-loss warning — the draft survives — so it offers to leave
                rather than to discard. */}
            <AlertDialog
                open={navigationBlocker.state === 'blocked'}
                onOpenChange={(open) => {
                    if (!open) {
                        navigationBlocker.reset?.();
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave with unpublished changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your changes are saved, but they won’t affect this automation until you publish them.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <Button onClick={() => navigationBlocker.proceed?.()}>Leave</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Prototype-only: the flask switcher for flipping design variations. */}
            <ProtoVariantSwitcher />
        </div>
    );
};

// Provider wraps the whole screen (not just the panel) so future slots — node
// styles, header treatments — can register without moving anything.
const AutomationFloatScreen: React.FC = () => (
    <ProtoVariantsProvider slots={[LEFT_PANEL_SLOT, EDITING_MODEL_SLOT, HEADER_SLOT, TRIGGER_CARD_SLOT]}>
        <AutomationFloat />
    </ProtoVariantsProvider>
);

export default AutomationFloatScreen;
export const Component = AutomationFloatScreen;
