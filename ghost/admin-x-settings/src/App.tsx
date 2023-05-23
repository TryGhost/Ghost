import Button from './admin-x-ds/global/Button';
import Heading from './admin-x-ds/global/Heading';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import {SettingsProvider} from './components/SettingsProvider';

function App() {
    return (
        <div className="admin-x-settings">
            <div className='fixed left-6 top-4'>
                <Button label='&larr; Done' onClick={() => window.history.back()} />
            </div>

            {/* Main container */}
            <div className="mx-auto flex max-w-[1080px] flex-col px-[5vmin] py-[12vmin] md:flex-row md:items-start md:gap-x-10 md:py-[8vmin]">

                {/* Sidebar */}
                <div className="relative min-w-[240px] grow-0 md:fixed md:top-[8vmin] md:basis-[240px]">
                    <div className='h-[60px]'>
                        <Heading>Settings</Heading>
                    </div>
                    <Sidebar />
                </div>
                <div className="flex-auto pt-[3vmin] md:ml-[280px] md:pt-[84px]">
                    <SettingsProvider>
                        <Settings />
                    </SettingsProvider>
                </div>
            </div>
        </div>
    );
}

export default App;
