import {Button, ButtonGroup, Page, ViewContainer} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const MainContent = () => {
    const {updateRoute} = useRouting();

    const dummyActions = [
        <Button label='Filter' link onClick={() => {
            alert('Clicked filter');
        }} />,
        <Button label='Sort' link onClick={() => {
            alert('Clicked sort');
        }} />,
        <Button icon='magnifying-glass' size='sm' link onClick={() => {
            alert('Clicked search');
        }} />,
        <ButtonGroup buttons={[
            {
                icon: 'listview',
                size: 'sm',
                link: true,
                iconColorClass: 'text-black',
                onClick: () => {
                    alert('Clicked list view');
                }
            },
            {
                icon: 'cardview',
                size: 'sm',
                link: true,
                iconColorClass: 'text-grey-500',
                onClick: () => {
                    alert('Clicked card view');
                }
            }
        ]} />
    ];

    const demoPage = (
        <Page>
            <ViewContainer
                // stickyHeader={false}
                actions={dummyActions}
                firstOnPage={true}
                primaryAction={{
                    title: 'Add item',
                    onClick: () => {
                        updateRoute('demo-modal');
                    }
                }}
                title='Demo page'
                type='page'
            >
                <div>hello</div>
            </ViewContainer>
        </Page>
    );

    return demoPage;
};

export default MainContent;
