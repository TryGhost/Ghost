import {cn} from '@tryghost/shade/utils';
import {motion} from 'motion/react';
import {memo, useMemo} from 'react';

import type {MotionProps} from 'motion/react';
import type {ComponentType, CSSProperties, ElementType, JSX} from 'react';

type MotionHTMLProps = MotionProps & Record<string, unknown>;

const motionComponentCache = new Map<keyof JSX.IntrinsicElements, ComponentType<MotionHTMLProps>>();

const getMotionComponent = (element: keyof JSX.IntrinsicElements) => {
    let component = motionComponentCache.get(element);
    if (!component) {
        component = motion.create(element);
        motionComponentCache.set(element, component);
    }
    return component;
};

export type ShimmerProps = {
    children: string;
    as?: ElementType;
    className?: string;
    duration?: number;
    spread?: number;
};

const ShimmerComponent = ({children, as: Component = 'p', className, duration = 2, spread = 2}: ShimmerProps) => {
    const MotionComponent = getMotionComponent(Component as keyof JSX.IntrinsicElements);
    const dynamicSpread = useMemo(() => children.length * spread, [children, spread]);

    return (
        <MotionComponent
            animate={{backgroundPosition: '0% center'}}
            className={cn(
                'builder-shimmer relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent motion-reduce:text-muted-foreground',
                '[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,transparent_calc(50%-var(--spread)),var(--color-background),transparent_calc(50%+var(--spread)))] motion-reduce:bg-none',
                className
            )}
            initial={{backgroundPosition: '100% center'}}
            style={{
                '--spread': `${dynamicSpread}px`,
                backgroundImage: 'var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))'
            } as CSSProperties}
            transition={{duration, ease: 'linear', repeat: Number.POSITIVE_INFINITY}}
        >
            {children}
        </MotionComponent>
    );
};

export const Shimmer = memo(ShimmerComponent);

Shimmer.displayName = 'Shimmer';
