import React from 'react';
import {Card, CardContent, CardHeader, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade';

interface KpiTabTriggerProps extends React.ComponentProps<typeof TabsTrigger> {
    children: React.ReactNode;
}

const KpiTabTrigger: React.FC<KpiTabTriggerProps> = ({children, ...props}) => {
    return (
        <TabsTrigger className='h-auto' {...props}>
            {children}
        </TabsTrigger>
    );
};

interface KpiTabValueProps {
    label: string;
    value: string | number;
}

const KpiTabValue: React.FC<KpiTabValueProps> = ({label, value}) => {
    return (
        <div className='flex w-full flex-col items-start'>
            <span className='text-lg'>{label}</span>
            <span className='text-[2.3rem] tracking-tighter'>{value}</span>
        </div>
    );
};

const Kpis:React.FC = () => {
    return (
        <Card className='col-span-2'>
            <Tabs defaultValue="visits" variant='underline'>
                <CardHeader>
                    <TabsList className="grid w-full grid-cols-4">
                        <KpiTabTrigger value="visits">
                            <KpiTabValue label="Unique visits" value="1,783" />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="views">
                            <KpiTabValue label="Pageviews" value="3,945" />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="bounce-rate">
                            <KpiTabValue label="Bounce rate" value="25%" />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="visit-duration">
                            <KpiTabValue label="Visit duration" value="4m 20s" />
                        </KpiTabTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent className='min-h-[20vw]'>
                    <TabsContent value="visits">
                        Visits chart
                    </TabsContent>
                    <TabsContent value="views">
                        Pageviews chart
                    </TabsContent>
                    <TabsContent value="bounce-rate">
                        Bounce chart
                    </TabsContent>
                    <TabsContent value="visit-duration">
                        Visit duration chart
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
};

export default Kpis;