export function PaywallCard() {
    return (
        <div className="flex items-center h-3 text-center text-grey-500 uppercase text-xs font-semibold whitespace-pre font-sans before:mr-2 after:ml-2 before:flex-1 before:border-t before:border-grey-300 after:border-grey-300 after:flex-1 after:border-t before:content-['']">
            Free public preview
            <span className="text-green mx-2">↑</span>
            /
            <span className="text-green mx-2">↓</span>
            Only visible to members
        </div>
    );
}