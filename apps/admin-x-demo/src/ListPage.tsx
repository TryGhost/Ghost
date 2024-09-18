import {Avatar, Button, ButtonGroup, DynamicTable, DynamicTableColumn, DynamicTableRow, Heading, Hint, Page, SortMenu, Tooltip, ViewContainer, showToast} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useState} from 'react';

const ListPage = () => {
    const {updateRoute} = useRouting();
    const [view, setView] = useState<string>('list');

    const dummyActions = [
        <Button label='Filter' onClick={() => {
            showToast({message: 'Were you really expecting a filter? 😛'});
        }} />,
        <SortMenu
            direction='desc'
            items={[
                {
                    id: 'date-added',
                    label: 'Date added',
                    selected: true
                },
                {
                    id: 'name',
                    label: 'Name'
                },
                {
                    id: 'redemptions',
                    label: 'Open Rate'
                }
            ]}
            position="start"
            onDirectionChange={() => {}}
            onSortChange={() => {}}
        />,
        <Tooltip content="Search members">
            <Button icon='magnifying-glass' size='sm' onClick={() => {
                alert('Clicked search');
            }} />
        </Tooltip>,
        <ButtonGroup buttons={[
            {
                icon: 'listview',
                size: 'sm',
                iconColorClass: (view === 'list' ? 'text-black' : 'text-grey-500'),
                onClick: () => {
                    setView('list');
                }
            },
            {
                icon: 'cardview',
                size: 'sm',
                iconColorClass: (view === 'card' ? 'text-black' : 'text-grey-500'),
                onClick: () => {
                    setView('card');
                }
            }
        ]} clearBg={false} link />
    ];

    const testColumns: DynamicTableColumn[] = [
        {
            title: 'Member',
            noWrap: true,
            minWidth: '1%',
            maxWidth: '1%'
        },
        {
            title: 'Status'
        },
        {
            title: 'Open rate'
        },
        {
            title: 'Location',
            noWrap: true
        },
        {
            title: 'Created',
            noWrap: true
        },
        {
            title: 'Signed up on post',
            noWrap: true,
            maxWidth: '150px'
        },
        {
            title: 'Newsletter'
        },
        {
            title: 'Billing period'
        },
        {
            title: 'Email sent'
        },
        {
            title: '',
            hidden: true,
            disableRowClick: true
        }
    ];

    const testRows = (noOfRows: number) => {
        const data: DynamicTableRow[] = [];
        for (let i = 0; i < noOfRows; i++) {
            data.push(
                {
                    onClick: () => {
                        updateRoute('detail');
                    },
                    cells: [
                        (<div className='flex items-center gap-3 whitespace-nowrap pr-10'>
                            <Avatar image={`https://i.pravatar.cc/150?img=${i}`} />
                            <div>
                                {i % 3 === 0 && <div className='whitespace-nowrap text-md'>Jamie Larson</div>}
                                {i % 3 === 1 && <div className='whitespace-nowrap text-md'>Giana Septimus</div>}
                                {i % 3 === 2 && <div className='whitespace-nowrap text-md'>Zaire Bator</div>}
                                <div className='text-grey-700'>jamie@larson.com</div>
                            </div>
                        </div>),
                        'Free',
                        '40%',
                        'London, UK',
                        <div>
                            <div>22 June 2023</div>
                            <div className='text-grey-500'>5 months ago</div>
                        </div>,
                        'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
                        'Subscribed',
                        'Monthly',
                        '1,303',
                        <Button color='green' label='Edit' link onClick={() => {
                            alert('Clicked Edit in row:' + i);
                        }} />
                    ]
                }
            );
        }
        return data;
    };

    const dummyCards = (noOfCards: number) => {
        const cards = [];

        for (let i = 0; i < noOfCards; i++) {
            cards.push(
                <div className='flex min-h-[20vh] cursor-pointer flex-col items-center gap-5 rounded-sm bg-grey-100 p-7 pt-9 transition-all hover:bg-grey-200' onClick={() => {
                    updateRoute('detail');
                }}>
                    <Avatar image={`https://i.pravatar.cc/150?img=${i}`} size='xl' />
                    <div className='flex flex-col items-center'>
                        <Heading level={5}>
                            {i % 3 === 0 && 'Jamie Larson'}
                            {i % 3 === 1 && 'Giana Septimus'}
                            {i % 3 === 2 && 'Zaire Bator'}
                        </Heading>
                        <div className='mt-1 text-sm text-grey-700'>
                            {i % 3 === 0 && 'jamie@larson.com'}
                            {i % 3 === 1 && 'giana@septimus.com'}
                            {i % 3 === 2 && 'zaire@bator.com'}
                        </div>
                    </div>
                    <div className='flex w-full flex-col gap-4 border-t border-grey-300 pt-5'>
                        {i % 3 === 0 && (<>
                            <div className='flex gap-4'>
                                <div className='basis-1/2 text-center'>
                                    <Heading level={6}>Open rate</Heading>
                                    <div className='text-lg'>83%</div>
                                </div>
                                <div className='basis-1/2 text-center'>
                                    <Heading level={6}>Click rate</Heading>
                                    <div className='text-lg'>19%</div>
                                </div>
                            </div>
                        </>)}
                        {i % 3 === 1 && (<>
                            <div className='flex gap-4'>
                                <div className='basis-1/2 text-center'>
                                    <Heading level={6}>Open rate</Heading>
                                    <div className='text-lg'>68%</div>
                                </div>
                                <div className='basis-1/2 text-center'>
                                    <Heading level={6}>Click rate</Heading>
                                    <div className='text-lg'>21%</div>
                                </div>
                            </div>
                        </>)}
                        {i % 3 === 2 && (<>
                            <div className='flex gap-4'>
                                <div className='basis-1/2 text-center'>
                                    <Heading level={6}>Open rate</Heading>
                                    <div className='text-lg'>89%</div>
                                </div>
                                <div className='basis-1/2 text-center'>
                                    <Heading level={6}>Click rate</Heading>
                                    <div className='text-lg'>34%</div>
                                </div>
                            </div>
                        </>)}
                    </div>
                </div>
            );
        }
        return cards;
    };

    let contents = <></>;
    switch (view) {
    case 'list':
        contents = <DynamicTable
            cellClassName='text-sm'
            columns={testColumns}
            footer={
                <Hint>30 members</Hint>
            }
            rows={testRows(30)}
            stickyFooter
            stickyHeader
        />;
        break;
    case 'card':
        contents = <div className='grid grid-cols-4 gap-8 py-8'>{dummyCards(30)}</div>;
        break;
    }

    const demoPage = (
        <Page>
            <ViewContainer
                actions={dummyActions}
                primaryAction={{
                    title: 'About',
                    onClick: () => {
                        updateRoute('demo-modal');
                    }
                }}
                title='AdminX Demo App'
                toolbarBorder={view === 'card'}
                type='page'
            >
                {contents}
            </ViewContainer>
        </Page>
    );

    return demoPage;
};

export default ListPage;
