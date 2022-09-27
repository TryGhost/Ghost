import '../styles/index.css';

const DesignSandbox = () => {
    return (
        <div className="koenig-lexical">
            <div className="text-slate-700 ring-slate-700/10 hover:bg-slate-50 hover:text-slate-900 pointer-events-auto relative inline-flex rounded-md bg-white text-[0.8125rem] font-medium leading-5 shadow-sm ring-1">
                <div className="flex py-2 px-3">
                    <svg className="fill-slate-400 mr-2.5 h-5 w-5 flex-none"><path d="M5 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14l-5-2.5L5 18V4Z"></path></svg>
                    Bookmark
                </div>
                <div className="border-slate-400/20 border-l py-2 px-2.5">12k</div>
            </div>
        </div>
    );
};

export default DesignSandbox;
