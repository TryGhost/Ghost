export function PaywallCard() {
    return (
        <div className="flex h-3 items-center whitespace-pre text-center font-sans text-xs font-semibold uppercase text-grey-500 before:mr-2 before:flex-1 before:border-t before:border-grey-300 before:content-[''] after:ml-2 after:flex-1 after:border-t after:border-grey-300 dark:text-grey-800">
            Free public preview
            <span className="mx-2 text-green">↑</span>
            /
            <span className="mx-2 text-green">↓</span>
            Only visible to members
        </div>
    );
}