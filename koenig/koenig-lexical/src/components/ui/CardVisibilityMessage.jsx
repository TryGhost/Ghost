export function CardVisibilityMessage({message}) {
    if (!message) {
        return null;
    }

    return (
        <div className="py-[.6rem] font-sans text-2xs font-semibold uppercase leading-8 tracking-normal text-grey dark:text-grey-800" data-testid="visibility-message">
            {message}
        </div>
    );
}
