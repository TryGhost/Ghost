import { IconError } from './icons';

export default ({title, error, errorText, children}) => (
    <div>
        <div className="gm-auth-header">
            { title ? (<h1>{title}</h1>) : "" }
            { children }
        </div>
        {(error ?
            <div class="gm-form-errortext"><i>{ IconError }</i>
                <span> {errorText} </span>
            </div> : "")
        }
    </div>
);
