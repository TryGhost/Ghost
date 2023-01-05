import SerializedStateTextarea from './SerializedStateTextarea';
import TreeView from './TreeView';

const Sidebar = ({isOpen, view}) => {
    return (
        <div className={`h-full grow overflow-hidden border-grey-100 bg-black pb-16 transition-all ease-in-out ${isOpen ? 'right-0 w-full opacity-100 sm:w-[440px]' : 'right-[-100%] w-0 opacity-0'}`}>
            {view === 'json' && <SerializedStateTextarea />}
            {view === 'tree' && <TreeView />}
        </div>
    );
};

export default Sidebar;
