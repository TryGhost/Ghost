import Header from '../../components/Header';
import Overview from './components/Overview';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, Icon, Page, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade';

const PostAnalytics = () => {
    return (
        <Page>
            <Header />
            <Tabs className='mt-7' defaultValue="overview" variant="link">
                <div className='flex items-center justify-center border-b pb-2'>
                    <TabsList className='w-full border-none'>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
                    </TabsList>
                    <div>
                        <div className='flex items-center gap-1'>
                            <Button variant='outline'><Icon.Share className='-mt-0.5' />Share</Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <Button variant='outline'><Icon.Dotdotdot /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-48">
                                    <DropdownMenuItem>
                                        <span>Edit post</span>
                                        <DropdownMenuShortcut>⇧⌘E</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <span>View in browser</span>
                                        <DropdownMenuShortcut>⇧⌘O</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red">Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
                <TabsContent value="overview">
                    <Overview />
                </TabsContent>
                <TabsContent value="newsletter">
                    Newsletter details
                </TabsContent>
            </Tabs>
        </Page>
    );
};

export default PostAnalytics;
