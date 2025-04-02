import React from 'react';
import {Card, CardContent, CardHeader, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade';

interface TechTabTriggerProps extends React.ComponentProps<typeof TabsTrigger> {
    children: React.ReactNode;
}

const TechTabTrigger: React.FC<TechTabTriggerProps> = ({children, ...props}) => {
    return (
        <TabsTrigger className='text-lg' {...props}>
            {children}
        </TabsTrigger>
    );
};

const Technical:React.FC = () => {
    return (
        <Card>
            <Tabs defaultValue="devices" variant='underline'>
                <CardHeader className='pt-3'>
                    <TabsList className="flex">
                        <TechTabTrigger value='devices'>
                            Devices
                        </TechTabTrigger>
                        <TechTabTrigger value='browsers'>
                            Browsers
                        </TechTabTrigger>
                        <TechTabTrigger value='os'>
                            OS
                        </TechTabTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent>
                    <TabsContent value="devices">
                        Devices chart
                    </TabsContent>
                    <TabsContent value="browsers">
                        Browsers chart
                    </TabsContent>
                    <TabsContent value="os">
                        OS chart
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
};

export default Technical;