import React, {useState} from 'react';

export type Tab = {
    id: string,
    title: string;
    contents?: React.ReactNode;
}

interface TabViewProps {
    tabs: Tab[];
    defaultSelected?: string;
}

const TabView: React.FC<TabViewProps> = ({tabs, defaultSelected}) => {
    if (tabs.length !== 0 && defaultSelected === undefined) {
        defaultSelected = tabs[0].id;
    }

    const [selectedTab, setSelectedTab] = useState(defaultSelected);

    if (tabs.length === 0) {
        return (<></>);
    }

    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id;
        setSelectedTab(newTab);
    };

    return (
        <section>
            <div className='flex gap-5 border-b border-grey-300'>
                {tabs.map(tab => (
                    <button key={tab.id} className={`-m-b-px cursor-pointer appearance-none border-b-[3px] py-1 text-sm transition-all after:invisible after:block after:h-px after:overflow-hidden after:font-bold after:text-transparent after:content-[attr(title)] ${selectedTab === tab.id ? 'border-black font-bold' : 'border-transparent hover:border-grey-500'}`} id={tab.id} title={tab.title} type="button" onClick={handleTabChange}>{tab.title}</button>
                ))}
            </div>
            {tabs.map(tab => (
                <div key={tab.id} className={`${selectedTab === tab.id ? 'block' : 'hidden'}`}>
                    <div>{tab.contents}</div>
                </div>
            ))}
        </section>
    );
};

export default TabView;