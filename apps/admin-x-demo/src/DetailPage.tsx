import {Avatar, Breadcrumbs, Button, Heading, Page, Toggle, ViewContainer} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const DetailPage: React.FC = () => {
    const {updateRoute} = useRouting();

    return (
        <Page
            breadCrumbs={
                <Breadcrumbs
                    items={[
                        {
                            label: 'Members',
                            onClick: () => {
                                updateRoute('');
                            }
                        },
                        {
                            label: 'Emerson Vaccaro'
                        }
                    ]}
                    onBack={() => {
                        updateRoute('');
                    }}
                />
            }
            fullBleedPage={false}
        >
            <ViewContainer
                firstOnPage={false}
                headerContent={
                    <div>
                        <Avatar bgColor='#A5D5F7' image='https://i.pravatar.cc/150' label='EV' labelColor='white' size='2xl' />
                        <Heading className='mt-2' level={1}>Emerson Vaccaro</Heading>
                        <div className=''>Colombus, OH</div>
                    </div>
                }
                primaryAction={
                    {
                        icon: 'ellipsis',
                        color: 'outline'
                    }
                }
                type='page'
            >
                <div className='grid grid-cols-3 border-b border-grey-200 pb-5 tablet:grid-cols-4'>
                    <div className='col-span-3 -ml-5 mb-5 hidden h-full gap-4 px-5 tablet:!visible tablet:col-span-1 tablet:mb-0 tablet:!flex tablet:flex-col tablet:gap-0'>
                        <span>Last seen on <strong>22 June 2023</strong></span>
                        <span className='tablet:mt-2'>Created on <strong>27 Jan 2021</strong></span>
                    </div>
                    <div className='flex h-full flex-col tablet:px-5'>
                        <Heading level={6}>Emails received</Heading>
                        <span className='mt-1 text-4xl font-bold leading-none'>181</span>
                    </div>
                    <div className='flex h-full flex-col tablet:px-5'>
                        <Heading level={6}>Emails opened</Heading>
                        <span className='mt-1 text-4xl font-bold leading-none'>104</span>
                    </div>
                    <div className='-mr-5 flex h-full flex-col tablet:px-5'>
                        <Heading level={6}>Average open rate</Heading>
                        <span className='mt-1 text-4xl font-bold leading-none'>57%</span>
                    </div>
                </div>
                <div className='grid grid-cols-2 items-baseline border-b border-grey-200 py-5 tablet:grid-cols-4'>
                    <div className='-ml-5 flex h-full flex-col gap-6 border-r border-grey-200 px-5'>
                        <div className='flex justify-between'>
                            <Heading level={5}>Member data</Heading>
                            <Button color='green' label='Edit' link />
                        </div>
                        <div>
                            <Heading level={6}>Name</Heading>
                            <div>Emerson Vaccaro</div>
                        </div>
                        <div>
                            <Heading level={6}>Email</Heading>
                            <div>emerson@vaccaro.com</div>
                        </div>
                        <div>
                            <Heading level={6}>Labels</Heading>
                            <div className='mt-2 flex gap-1'>
                                <div className='inline-block rounded-sm bg-grey-200 px-1.5 text-xs font-medium'>VIP</div>
                                <div className='inline-block rounded-sm bg-grey-200 px-1.5 text-xs font-medium'>Inner Circle</div>
                            </div>
                        </div>
                        <div>
                            <Heading level={6}>Notes</Heading>
                            <div className='text-grey-500'>No notes.</div>
                        </div>
                    </div>
                    <div className='flex h-full flex-col gap-6 border-grey-200 px-5 tablet:border-r'>
                        <Heading level={5}>Newsletters</Heading>
                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center gap-2'>
                                <Toggle />
                                <span>Daily news</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Toggle />
                                <span>Weekly roundup</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Toggle checked />
                                <span>The Inner Circle</span>
                            </div>
                            <div className='mt-5 rounded border border-red p-4 text-sm text-red'>
                                This member cannot receive emails due to permanent failure (bounce).
                            </div>
                        </div>
                    </div>
                    <div className='-ml-5 flex h-full flex-col gap-6 border-r border-grey-200 px-5 pt-10 tablet:ml-0 tablet:pt-0'>
                        <Heading level={5}>Subscriptions</Heading>
                        <div className='flex items-center gap-3'>
                            <div className='flex h-16 w-16 flex-col items-center justify-center rounded-md bg-grey-200'>
                                <Heading level={5}>$5</Heading>
                                <span className='text-xs text-grey-700'>Yearly</span>
                            </div>
                            <div className='flex flex-col'>
                                <span className='font-semibold'>Gold</span>
                                <span className='text-sm text-grey-500'>Renews 21 Jan 2024</span>
                            </div>
                        </div>
                    </div>
                    <div className='-mr-5 flex h-full flex-col gap-6 px-5 pt-10 tablet:pt-0'>
                        <div className='flex justify-between'>
                            <Heading level={5}>Activity</Heading>
                            <Button color='green' label='View all' link />
                        </div>
                        <div className='flex flex-col text-sm'>
                            <span className='font-semibold'>Logged in</span>
                            <span className='text-sm text-grey-500'>13 days ago</span>
                        </div>
                        <div className='flex flex-col text-sm'>
                            <span className='font-semibold'>Subscribed to Daily News</span>
                            <span className='text-sm text-grey-500'>17 days ago</span>
                        </div>
                        <div className='flex flex-col text-sm'>
                            <span className='font-semibold'>Logged in</span>
                            <span className='text-sm text-grey-500'>21 days ago</span>
                        </div>
                    </div>
                </div>
            </ViewContainer>
        </Page>
    );
};

export default DetailPage;
