export const SkeletonComment = () => {
    return (
        <div className="mb-7 flex w-full animate-pulse flex-row">
            <div className="mr-2 flex flex-col items-center justify-start sm:mr-3">
                <div className="flex-0 mb-3 sm:mb-4">
                    <div className="relative h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-100"></div>
                    </div>
                </div>
            </div>
            <div className="grow">
                <div>
                    <div className="mb-2 mt-0.5 flex flex-row flex-wrap items-start sm:flex-row">
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-100"></div>
                        <div className="ml-4 h-4 w-16 animate-pulse rounded bg-gray-100"></div>
                    </div>
                    <div className="mt mb-2 flex flex-row items-center gap-4 pr-4">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100"></div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-4 w-12 animate-pulse rounded bg-gray-100"></div>
                        <div className="h-4 w-12 animate-pulse rounded bg-gray-100"></div>
                        <div className="h-4 w-8 rounded bg-gray-100"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};