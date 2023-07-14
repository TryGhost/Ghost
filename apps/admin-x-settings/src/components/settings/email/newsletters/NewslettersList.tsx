import Button from '../../../../admin-x-ds/global/Button';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import NewsletterDetailModal from './NewsletterDetailModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';

interface NewslettersListProps {
    tab?: string;
}

const NewslettersList: React.FC<NewslettersListProps> = ({
    tab
}) => {
    const action = tab === 'active-newsletters' ? (
        <Button color='green' label='Archive' link />
    ) : (
        <Button color='green' label='Activate' link />
    );

    return (
        <List>
            <ListItem
                action={action}
                detail='This one is pretty good'
                title='Amazing newsletter'
                hideActions
                onClick={() => {
                    NiceModal.show(NewsletterDetailModal);
                }}
            />
            <ListItem
                action={action}
                detail='This one is just spam'
                title='Awful newsletter'
                hideActions
                onClick={() => {
                    NiceModal.show(NewsletterDetailModal);
                }}
            />
        </List>
    );
};

export default NewslettersList;