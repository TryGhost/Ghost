import {ReactComponent as SpinnerIcon} from '../../images/icons/spinner.svg';

function Loading() {
    return (
        <div className="flex h-32 w-full items-center justify-center" data-testid="loading">
            <SpinnerIcon className="mb-6 h-12 w-12 fill-white/90 dark:fill-white/60" />
        </div>
    );
}

export default Loading;
