export function Loader({isLazyLoading}) {
    if (isLazyLoading) {
        return (
            <div className="inset-y-0 w-full p-6 text-center">
                <div className="inline-block h-[50px] w-[50px] animate-spin rounded-full border border-black/10 before:z-10 before:mt-[7px] before:block before:h-[7px] before:w-[7px] before:rounded-full before:bg-grey-800"></div>
            </div>
        );
    }
    return (
        <div className="absolute inset-y-0 left-0 flex w-full items-center justify-center overflow-hidden">
            <div className="relative inline-block h-[50px] w-[50px] animate-spin rounded-full border border-black/10 before:z-10 before:mt-[7px] before:block before:h-[7px] before:w-[7px] before:rounded-full before:bg-grey-800"></div>
        </div>
    );
}
