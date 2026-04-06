import MembersContent from './components/members-content';
import MembersLayout from './components/members-layout';
import {Button} from '@tryghost/shade/components';
import {ListHeader} from '@tryghost/shade/primitives';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import type React from 'react';

const MemberDetail: React.FC = () => {
    const {memberId} = useParams();
    const navigate = useNavigate();
    const memberDetailDescription = `React exploration surface for member ${memberId ?? 'unknown'}`;

    return (
        <MembersLayout>
            <div className='sticky top-0 z-50 bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md dark:bg-black'>
                <ListHeader className='border-none'>
                    <ListHeader.Left>
                        <ListHeader.Title>Member detail</ListHeader.Title>
                        <ListHeader.Description>
                            <span className='font-mono'>{memberDetailDescription}</span>
                        </ListHeader.Description>
                    </ListHeader.Left>
                    <ListHeader.Actions>
                        <Button variant='outline' onClick={() => navigate('/members-forward')}>
                            Back to members
                        </Button>
                    </ListHeader.Actions>
                </ListHeader>
            </div>
            <MembersContent>
                <div className='flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground'>
                    Empty detail screen. Use this page to experiment with React member detail layouts.
                </div>
            </MembersContent>
        </MembersLayout>
    );
};

export default MemberDetail;
