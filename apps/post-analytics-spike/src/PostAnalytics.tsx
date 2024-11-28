import {Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade';
import Header from './components/layout/Header';
import EmailStats from './components/email/EmailStats';
import WebStats from './components/web/WebStats';
import OverviewStats from './components/overview/OverviewStats';

const PostAnalytics = () => {
    return (
        // The div below should be converted into an app container component in the design system
        <div className="p-8 pt-9">

            <Header />

            <Tabs className="mt-8" defaultValue="overview" variant="bordered">
                <TabsList className="flex w-full justify-start gap-5">
                    <TabsTrigger className="flex items-center gap-2" value="overview">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger className="flex items-center gap-2" value="email">
                        Newsletter
                    </TabsTrigger>
                    <TabsTrigger className="flex items-center gap-2" value="web">
                        Website
                    </TabsTrigger>
                    <TabsTrigger className="flex items-center gap-2" value="comments">
                        Comments
                    </TabsTrigger>
                    <TabsTrigger className="flex items-center gap-2" value="growth">
                        Growth
                    </TabsTrigger>
                </TabsList>

                <TabsContent className='mt-0' value="overview">
                    <OverviewStats />
                </TabsContent>
                <TabsContent className='mt-0' value="email">
                    <EmailStats />
                </TabsContent>
                <TabsContent className='mt-0' value="web">
                    <WebStats />
                </TabsContent>
            </Tabs>

        </div>
    );
};

export default PostAnalytics;