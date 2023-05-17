import Settings from './components/Settings';
import Sidebar from './components/Sidebar';

function App() {
    return (
        <div className="admin-x-settings">
            <button
                className="fixed left-6 top-4 text-sm font-bold text-black"
                type="button"
                onClick={() => window.history.back()}
            >
                &larr; Done
            </button>

            {/* Main container */}
            <div className="mx-auto flex max-w-[1080px] flex-col px-[5vmin] py-[12vmin] md:flex-row md:items-start md:gap-x-10 md:py-[8vmin]">

                {/* Sidebar */}
                <div className="relative grow-0 md:sticky md:top-[8vmin] md:basis-[240px]">
                    <h1 className="font-inter text-5xl">Settings</h1>
                    <Sidebar />
                </div>
                <div className="flex-auto pt-[3vmin] md:pt-[72px]">
                    <Settings />
                </div>
            </div>
        </div>
    );
}

export default App;
