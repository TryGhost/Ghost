import {Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

export const Checkpoint = ({disabled, onReturn}: {disabled?: boolean; onReturn: () => void}) => (
    <Button disabled={disabled} size='sm' type='button' variant='ghost' onClick={onReturn}>
        <LucideIcon.History aria-hidden='true' />
        Return to before this message
    </Button>
);
