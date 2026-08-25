import '@xyflow/react/dist/style.css';
import React, {useState} from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger} from '@tryghost/shade/components';
import {Controls, useReactFlow, useViewport} from '@xyflow/react';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {CANVAS_ZOOM_CONFIG} from './use-canvas-viewport';

const VIEWPORT_ANIMATION_DURATION = 180;

interface AutomationCanvasControlsProps {
    /**
     * Where the control sits in the canvas, as an inset from the bottom-left
     * corner: {bottom, left} in px.
     *
     * The component used to decide this for itself, and nothing outside it could
     * change its mind. React Flow gives every panel `margin: 15px` plus corner
     * offsets on two-class selectors (`.react-flow__panel.bottom`), so a caller's
     * Tailwind class loses on specificity, and the inline style this used to carry
     * beat everything regardless. Between them the control was fixed at 39px from
     * each edge with no way to move it — which meant it could only ever live in one
     * canvas, and a second one wanting it elsewhere would have to fork it.
     *
     * Both the margin and the offsets are now zeroed here, so whatever a canvas
     * passes IS the true inset. Nothing is assumed about the corner.
     */
    style?: React.CSSProperties;
}

export const AutomationCanvasControls: React.FC<AutomationCanvasControlsProps> = ({style}) => {
    const [open, setOpen] = useState(false);
    const {fitView, zoomIn, zoomOut, zoomTo} = useReactFlow();
    const {zoom} = useViewport();
    const animationOptions = {duration: VIEWPORT_ANIMATION_DURATION};
    const zoomPercent = Math.round(zoom * 100);

    const handleZoomTo = (nextZoom: number) => {
        setOpen(false);
        void zoomTo(nextZoom, animationOptions);
    };

    const handleFitView = () => {
        setOpen(false);
        void fitView(animationOptions);
    };

    return (
        <Controls
            className='gap-1 overflow-hidden rounded-md bg-surface-elevated p-0.5 text-foreground shadow-sm'
            orientation='horizontal'
            showFitView={false}
            showInteractive={false}
            showZoom={false}
            style={{margin: 0, bottom: 0, left: 0, ...style}}
        >
            <Button
                aria-label='Zoom out'
                className='rounded-sm text-text-secondary hover:text-foreground'
                disabled={zoom <= CANVAS_ZOOM_CONFIG.minZoom}
                size='icon'
                title='Zoom out'
                type='button'
                variant='ghost'
                onClick={() => void zoomOut(animationOptions)}
            >
                <LucideIcon.Minus className='size-5' strokeWidth={1.5} />
            </Button>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        aria-label={`Zoom level ${formatNumber(zoomPercent)}%`}
                        className='h-9 min-w-14 rounded-sm px-2 font-semibold'
                        type='button'
                        variant='ghost'
                    >
                        {formatNumber(zoomPercent)}%
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='center' className='w-40' side='top' sideOffset={12}>
                    {CANVAS_ZOOM_CONFIG.presets.map((preset) => {
                        const presetPercent = Math.round(preset * 100);
                        const isSelected = Math.abs(zoom - preset) < 0.01;
                        return (
                            <DropdownMenuItem key={preset} onSelect={() => handleZoomTo(preset)}>
                                {formatNumber(presetPercent)}%
                                {isSelected && (
                                    <DropdownMenuShortcut>
                                        <LucideIcon.Check className='size-4 text-text-secondary' strokeWidth={1.5} />
                                    </DropdownMenuShortcut>
                                )}
                            </DropdownMenuItem>
                        );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleFitView}>
                      Fit to view
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button
                aria-label='Zoom in'
                className='rounded-sm text-text-secondary hover:text-foreground'
                disabled={zoom >= CANVAS_ZOOM_CONFIG.maxZoom}
                size='icon'
                title='Zoom in'
                type='button'
                variant='ghost'
                onClick={() => void zoomIn(animationOptions)}
            >
                <LucideIcon.Plus className='size-5' strokeWidth={1.5} />
            </Button>
        </Controls>
    );
};
