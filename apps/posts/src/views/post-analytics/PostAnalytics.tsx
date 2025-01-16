import Header from '../../components/Header';
import Newsletter from './components/Newsletter';
import Overview from './components/Overview';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, Icon, Page, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade';

interface postAnalyticsProps {};

const PostAnalytics: React.FC<postAnalyticsProps> = () => {
    return (
        <Page>
            <Header />
            <Tabs className='mt-7' defaultValue="overview" variant="button">
                <div className='flex items-center justify-between'>
                    <TabsList className='border-none'>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
                    </TabsList>
                    <div className='flex items-center gap-2'>
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
                <TabsContent value="overview">
                    <Overview />
                </TabsContent>
                <TabsContent className='mt-0' value="newsletter">
                    <Newsletter />
                </TabsContent>
            </Tabs>
        </Page>
    );
};

export default PostAnalytics;
