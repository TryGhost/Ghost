import '@xyflow/react/dist/style.css';
import React, {useState} from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger} from '@tryghost/shade/components';
import {Controls, useReactFlow, useViewport} from '@xyflow/react';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';

const VIEWPORT_ANIMATION_DURATION = 180;
const ZOOM_PRESETS = [1.5, 1, 0.75, 0.5, 0.25];

export const AutomationCanvasControls: React.FC = () => {
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
            style={{bottom: 24, left: 24}}
        >
            <Button
                aria-label='Zoom out'
                className='rounded-sm text-text-secondary hover:text-foreground'
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
                    {ZOOM_PRESETS.map((preset) => {
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