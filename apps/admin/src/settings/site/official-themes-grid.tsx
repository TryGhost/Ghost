import { useEffect, useState } from "react";
import { cn } from "@tryghost/shade/utils";

import { type OfficialTheme, getAllVariants, hasVariants, useOfficialThemes } from "./official-themes";

/**
 * The official themes gallery, ported from the legacy
 * theme/official-themes.tsx: card grid with the hover variant loop and the
 * marketplace footer.
 */

const VARIANT_LOOP_INTERVAL = 3000;

export function OfficialThemesGrid({ onSelectTheme }: { onSelectTheme: (theme: OfficialTheme) => void }) {
    const themes = useOfficialThemes();
    const [variantLoopTheme, setVariantLoopTheme] = useState<OfficialTheme | null>(null);
    const [visibleVariantIdx, setVisibleVariantIdx] = useState(0);

    const setupVariantLoop = (theme: OfficialTheme | null) => {
        setVariantLoopTheme(theme);
        setVisibleVariantIdx(theme !== null && hasVariants(theme) && getAllVariants(theme).length > 1 ? 1 : 0);
    };

    useEffect(() => {
        if (variantLoopTheme === null) {
            return;
        }

        const loopInterval = setInterval(() => {
            setVisibleVariantIdx((visibleVariantIdx + 1) % (getAllVariants(variantLoopTheme).length || 1));
        }, VARIANT_LOOP_INTERVAL);

        return () => clearInterval(loopInterval);
    }, [variantLoopTheme, visibleVariantIdx]);

    return (
        <div className="mx-auto w-full max-w-[1600px] px-[8vmin] pb-[8vmin]">
            <h1 className="pt-[4vmin] pb-2 text-3xl font-bold tracking-tight">Themes</h1>
            <div className="mt-[6vmin] grid grid-cols-1 gap-[6vmin] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {themes.map((theme) => {
                    const showVariants = hasVariants(theme);
                    const variants = getAllVariants(theme);
                    const isVariantLooping = variantLoopTheme === theme;

                    return (
                        <button key={theme.name} className="flex cursor-pointer flex-col gap-3 text-left" type="button" onClick={() => onSelectTheme(theme)}>
                            <div className="relative w-full bg-muted shadow-md transition-all duration-500 hover:scale-[1.05]" onMouseEnter={() => setupVariantLoop(theme)} onMouseLeave={() => setupVariantLoop(null)}>
                                {showVariants ? (
                                    variants.map((variant, idx) => (
                                        <img
                                            key={`theme-variant-${variant.category.toLowerCase()}`}
                                            alt={`${theme.name} Theme - ${variant.category}`}
                                            className={cn("size-full object-contain opacity-0 transition-opacity duration-500", {
                                                "opacity-100": (idx === visibleVariantIdx && isVariantLooping) || (!isVariantLooping && idx === 0),
                                                relative: idx === visibleVariantIdx,
                                                absolute: idx !== visibleVariantIdx,
                                                "top-0 left-0": idx !== visibleVariantIdx,
                                            })}
                                            src={variant.image}
                                        />
                                    ))
                                ) : (
                                    <img
                                        alt={`${theme.name} Theme`}
                                        className="size-full object-contain"
                                        src={theme.image}
                                    />
                                )}
                            </div>
                            <div className="relative mt-3">
                                <h4 className="text-lg font-semibold">{theme.name}</h4>
                                {showVariants ? (
                                    variants.map((variant, idx) => (
                                        <span key={variant.category} className={cn("absolute left-0 translate-y-px text-muted-foreground opacity-0", {
                                            "opacity-100": (idx === visibleVariantIdx && isVariantLooping) || (!isVariantLooping && idx === 0),
                                        })}>{variant.category}</span>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground">{theme.category}</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            <div className="mt-[8vmin] -mb-[8vmin] bg-black px-[8vmin] py-16 text-center text-lg text-white">
                Find and buy third-party, premium themes from independent developers in the{" "}
                <a className="inline-block font-semibold text-green-300" href="https://ghost.org/themes/" rel="noopener noreferrer" target="_blank">Ghost Marketplace &rarr;</a>
            </div>
        </div>
    );
}
