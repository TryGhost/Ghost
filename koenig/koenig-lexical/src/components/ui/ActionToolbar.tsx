import {useKoenigSelectedCardContext} from '../../context/KoenigSelectedCardContext';

export function ActionToolbar({isVisible, children, ...props}) {
    const {isDragging} = useKoenigSelectedCardContext();

    if (isVisible && !isDragging) {
        // own compositing layer: Safari leaves tooltips drawn outside the toolbar on screen
        // after it unmounts when they're painted into the page's layer
        return (
            <div className="not-kg-prose absolute left-1/2 top-[-46px] z-[1000] -translate-x-1/2 will-change-transform" {...props}>
                {children}
            </div>
        );
    }
}
