import '../styles/index.css';
import {ReactComponent as BoldIcon} from '../assets/icons/kg-bold.svg';
import {ReactComponent as ItalicIcon} from '../assets/icons/kg-italic.svg';
import {ReactComponent as HeadingOneIcon} from '../assets/icons/kg-heading-1.svg';
import {ReactComponent as HeadingTwoIcon} from '../assets/icons/kg-heading-2.svg';
import {ReactComponent as LinkIcon} from '../assets/icons/kg-link.svg';
import {ReactComponent as QuoteIcon} from '../assets/icons/kg-quote.svg';
import {ReactComponent as SnippetIcon} from '../assets/icons/kg-snippet.svg';

const DesignSandbox = () => {
    return (
        <div className="koenig-lexical">
            <h3 className="mb-4 mt-8 text-xl font-bold">Floating toolbar</h3>

            <div className="max-w-fit">
                <ul className="text-md m-0 flex items-center justify-evenly rounded bg-black px-1 py-0 font-sans font-normal text-white">
                    <MenuItem label="Format text as bold" Icon={BoldIcon} />
                    <MenuItem label="Format text as italics" Icon={ItalicIcon} />
                    <MenuItem label="Toggle heading 1" Icon={HeadingOneIcon} />
                    <MenuItem label="Toggle heading 2" Icon={HeadingTwoIcon} />
                    <MenuSeparator />
                    <MenuItem label="Toggle blockquote" Icon={QuoteIcon} />
                    <MenuItem label="Insert link" Icon={LinkIcon} />
                    <MenuSeparator />
                    <MenuItem label="Save as snippet" Icon={SnippetIcon} />
                </ul>
            </div>      
        </div>
    );

    function MenuItem({label, Icon, ...props}) {
        return (
            <li className="m-0 flex p-0 first:m-0" {...props}>
                <div
                    type="button"
                    className="flex h-9 w-9 items-center justify-center"
                >
                    <Icon className="fill-white" />
                </div>
            </li>
        );
    }
    
    function MenuSeparator() {
        return (
            <li className="bg-grey-900 m-0 mx-1 h-5 w-px"></li>
        );
    }
};

export default DesignSandbox;
