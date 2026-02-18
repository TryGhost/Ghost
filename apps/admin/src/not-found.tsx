export function NotFound() {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">404</h1>
                <span className="text-grey-500">|</span>
                <h2 className="text-lg text-grey-700">Page not found</h2>
            </div>
        </div>
    );
}
