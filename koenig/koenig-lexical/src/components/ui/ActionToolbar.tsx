import {useKoenigSelectedCardContext} from '../../context/KoenigSelectedCardContext';

export function ActionToolbar({isVisible, children, ...props}) {
    const {isDragging} = useKoenigSelectedCardContext();

    if (isVisible && !isDragging) {
        // Safari repaints only a removed element's own painted area, so this transparent
        // shadow stretches it over the tooltips and menu shadow drawn around the toolbar
        return (
            <div className="not-kg-prose absolute left-1/2 top-[-46px] z-[1000] -translate-x-1/2 shadow-[0_0_0_48px_transparent]" {...props}>
                {children}
            </div>
        );
    }
}
