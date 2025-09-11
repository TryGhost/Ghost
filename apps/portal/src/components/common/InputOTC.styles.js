export const InputOTCStyles = `
/* -------------------- InputOTCSlot -------------------- */
.gh-portal-input-otc-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.gh-portal-input-otc-outer {
    display: flex;
    justify-content: center;
    margin-top: -20px;
    margin-bottom: -20px;
}

.gh-portal-input-otc-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

/* Dim container if it has any disabled descendants */
.gh-portal-input-otc-container:has(:disabled) {
    opacity: 0.5;
}

.gh-portal-input-otc :disabled,
.gh-portal-input-otc[aria-disabled="true"] {
    cursor: not-allowed;
}

.gh-portal-input-otc-group {
    display: flex;
    align-items: center;
}

/* -------------------- InputOTCSlot -------------------- */
.gh-portal-input-otc-slot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    font-size: 1.4rem;
    color: inherit;
    background: transparent;
    /* deliberately leaves out left border to avoid doubling up */
    border-top: 1px solid var(--grey11);
    border-right: 1px solid var(--grey11);
    border-bottom: 1px solid var(--grey11);
    outline: none;
    transition: all 0.2s ease;
    box-shadow: 0 1px 0 rgba(var(--blackrgb), 0.04);
}

/* First and last slot rounding and left border */
.gh-portal-input-otc-slot:first-child {
    border-left: 1px solid var(--grey11);
    border-top-left-radius: 6px;
    border-bottom-left-radius: 6px;
}

.gh-portal-input-otc-slot:last-child {
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
}

/* Seam color: ensure the left edge of an active slot matches the ring/border by
   tinting the previous sibling's right border (so the shared seam isn't gray) */
.gh-portal-input-otc-group .gh-portal-input-otc-slot:has(+ .gh-portal-input-otc-slot[data-active="true"]) {
    border-right-color: var(--brandcolor);
}

/* opaque ring around the active slot */
.gh-portal-input-otc-slot[data-active="true"] {
    z-index: 10;
    border-color: var(--brandcolor);
    box-shadow: 0 0 0 3px rgba(20, 110, 255, 0.5); /* fallback ring color */
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--brandcolor), transparent 50%); /* ring color */
}

/* -------------------- Error Styles -------------------- */
/* Seam color for invalid + active: prefer error tint on the seam */
.gh-portal-input-otc-root[data-invalid="true"] .gh-portal-input-otc-group .gh-portal-input-otc-slot:has(+ .gh-portal-input-otc-slot[data-active="true"]) {
    border-right-color: var(--red);
}

/* Invalid state border (references parent to apply to all slots) */
.gh-portal-input-otc-root[data-invalid="true"] .gh-portal-input-otc-slot {
    border-color: var(--red);
}

/* Invalid + active state ring (references parent to apply to active slot) */
.gh-portal-input-otc-root[data-invalid="true"] .gh-portal-input-otc-slot[data-active="true"] {
    box-shadow: 0 0 0 3px rgba(240, 37, 37, 0.2);
}

/* Reserved error area above OTC input */
.gh-portal-input-otc-error {
    min-height: 22px;
    margin: 0 0 6px;
    visibility: hidden;
}

.gh-portal-input-otc-error[data-visible="true"] {
    visibility: visible;
}


/* -------------------- Blinking Caret -------------------- */
.gh-portal-input-otc-caret-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

/* Blinking caret */
.gh-portal-input-otc-caret {
    width: 1px;
    height: 16px;
    background: var(--grey0);
    animation: gh-portal-caret-blink 1s steps(2, start) infinite;
}

@keyframes gh-portal-caret-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
`;

export default InputOTCStyles;

