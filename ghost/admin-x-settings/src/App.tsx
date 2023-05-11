import MainHeader from "./components/global/MainHeader";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";

function App() {
    return (
    <div>
        <button className="fixed top-4 left-6 text-sm font-bold text-black">&larr; Done</button>
        
        {/* Main container */}
        <div className="max-w-[1080px] flex flex-col mx-auto px-[5vmin] py-[12vmin] md:flex-row md:gap-x-10 md:py-[8vmin] md:items-start">
            
            {/* Sidebar */}
            <div className="md:top-[8vmin] flex-grow-0 md:basis-[240px] relative md:sticky">
                <MainHeader />
                <Sidebar />
            </div>
            <div className="pt-[3vmin] flex-auto md:pt-[72px]">
                <Settings />
            </div>
        </div>
    </div>
    );
}

export default App;
