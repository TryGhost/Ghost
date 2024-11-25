import { Icon, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade";
import Header from "./components/layout/Header";
import EmailStats from "./components/email/EmailStats";
import WebStats from "./components/web/WebStats";

const PostAnalytics = () => {
    return (
        // The div below should be converted into an app container component in the design system
        <div className="p-8 pt-9">

            <Header />

            <Tabs className="mt-8" defaultValue="email" variant="bordered">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="email" className="flex items-center gap-1">
                        <Icon name="email" size={'sm'} /> Email
                    </TabsTrigger>
                    <TabsTrigger value="web" className="flex items-center gap-1">
                        <Icon name="world-clock" size={'sm'} /> Web
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="email">
                    <EmailStats />
                </TabsContent>
                <TabsContent value="web">
                    <WebStats />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default PostAnalytics;