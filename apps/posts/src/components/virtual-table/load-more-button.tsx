import {Button} from '@tryghost/shade/components';

interface LoadMoreButtonProps {
    isLoading?: boolean;
    onClick: () => void;
}

const LoadMoreButton = ({isLoading, onClick}: LoadMoreButtonProps) => {
    const isButtonLoading = Boolean(isLoading);

    return (
        <div className="flex justify-center px-4 py-6">
            <Button
                disabled={isButtonLoading}
                variant="outline"
                onClick={onClick}
            >
                {isButtonLoading ? 'Loading more...' : 'Load more'}
            </Button>
        </div>
    );
};

export default LoadMoreButton;
