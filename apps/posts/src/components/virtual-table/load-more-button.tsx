import {Button} from '@tryghost/shade';

interface LoadMoreButtonProps {
    isLoading: boolean;
    onClick: () => void;
}

const LoadMoreButton = ({isLoading, onClick}: LoadMoreButtonProps) => {
    return (
        <div className="flex justify-center px-4 py-6">
            <Button
                disabled={isLoading}
                variant="outline"
                onClick={onClick}
            >
                {isLoading ? 'Loading more...' : 'Load more'}
            </Button>
        </div>
    );
};

export default LoadMoreButton;
