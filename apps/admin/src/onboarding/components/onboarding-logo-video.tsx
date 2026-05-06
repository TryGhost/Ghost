import logoLoaderDarkUrl from "@/assets/videos/logo-loader-dark.mp4";
import logoLoaderUrl from "@/assets/videos/logo-loader.mp4";

export function OnboardingLogoVideo() {
    return (
        <div className="relative mb-6 size-20">
            <video
                aria-hidden="true"
                autoPlay
                className="size-20 dark:hidden"
                height={80}
                loop
                muted
                playsInline
                preload="metadata"
                role="presentation"
                tabIndex={-1}
                width={80}
            >
                <source src={logoLoaderUrl} type="video/mp4" />
            </video>
            <video
                aria-hidden="true"
                autoPlay
                className="hidden size-20 dark:block"
                height={80}
                loop
                muted
                playsInline
                preload="metadata"
                role="presentation"
                tabIndex={-1}
                width={80}
            >
                <source src={logoLoaderDarkUrl} type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-0 hidden bg-[hsl(216deg_11%_70%/1%)] dark:block" />
        </div>
    );
}
