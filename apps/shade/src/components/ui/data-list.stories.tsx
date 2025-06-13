import type {Meta, StoryObj} from '@storybook/react';
import {DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow} from './data-list';

const meta = {
    title: 'Components / Data List',
    component: DataList,
    tags: ['autodocs']
} satisfies Meta<typeof DataList>;

export default meta;
type Story = StoryObj<typeof DataList>;

export const Default: Story = {
    args: {
        className: '',
        children: [
            <DataListHeader>
                <DataListHead>Title</DataListHead>
                <DataListHead>Visitors</DataListHead>
            </DataListHeader>,
            <DataListBody className='group/datalist'>
                <DataListRow>
                    <DataListBar />
                    <DataListItemContent>
                        <div className='flex items-center space-x-4 overflow-hidden'>
                            <div>🇺🇸</div>
                            <div className='truncate font-medium'>
                                Clean Monochrome Workspace in Düsseldorf, Germany A Designer’s Dual Apple Studio Display Workspace in Canada
                            </div>
                        </div>
                    </DataListItemContent>
                    <DataListItemValue>
                        <DataListItemValueAbs>997,999,999</DataListItemValueAbs>
                        <DataListItemValuePerc>100%</DataListItemValuePerc>
                    </DataListItemValue>
                </DataListRow>

                <DataListRow>
                    <DataListBar style={{
                        width: '93%'
                    }} />
                    <DataListItemContent>
                        <div className='flex items-center space-x-4 overflow-hidden'>
                            <div>🇺🇸</div>
                            <div className='truncate font-medium'>
                                No percentage value, no animation
                            </div>
                        </div>
                    </DataListItemContent>
                    <DataListItemValue>
                        <DataListItemValueAbs>846.26</DataListItemValueAbs>
                    </DataListItemValue>
                </DataListRow>

                <DataListRow>
                    <DataListBar style={{
                        width: '74%'
                    }} />
                    <DataListItemContent>
                        <div className='flex items-center space-x-4 overflow-hidden'>
                            <div className='flex items-center gap-3 truncate'>
                                <div>🏴‍☠️</div>
                                <div className='overflow-hidden'>
                                    <div className='truncate font-medium'>Clean Monochrome Workspace in Düsseldorf, Germany A Designer’s Dual Apple Studio Display Workspace in Canada</div>
                                    <div className='truncate text-muted-foreground'>Published</div>
                                </div>
                            </div>
                        </div>
                    </DataListItemContent>
                    <DataListItemValue>
                        <DataListItemValueAbs>662</DataListItemValueAbs>
                        <DataListItemValuePerc>74%</DataListItemValuePerc>
                    </DataListItemValue>
                </DataListRow>

                <DataListRow>
                    <DataListItemContent>
                            No bar, no animation, no nothing
                    </DataListItemContent>
                    <DataListItemValue>
                        <DataListItemValueAbs>19</DataListItemValueAbs>
                    </DataListItemValue>
                </DataListRow>
            </DataListBody>
        ]
    }
};
