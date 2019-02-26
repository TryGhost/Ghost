export default ({type, name, placeholder, value = '', error, onInput, required, className, children, icon}) => (
    <div className="gm-form-element">
        <div className={[
                (className ? className : ""),
                "gm-input"
                ].join(' ')}>
            <input
                type={ type }
                name={ name }
                key={ name }
                placeholder={ placeholder }
                value={ value }
                onInput={ (e) => onInput(e, name) }
                required={ required }
                className={[
                    (value ? "gm-input-filled" : ""),
                    (error ? "gm-error" : "")
                ].join(' ')}
            />
            <i>{ icon }</i>
            { children }
        </div>
    </div>
);
