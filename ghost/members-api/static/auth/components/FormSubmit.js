export default ({onClick, buttonClass, showSpinner, disabled, label}) => (
    <div className="mt7">
        <button type="submit" className={ (buttonClass ? buttonClass : "gm-btn-blue") } onClick={onClick} disabled={ ((disabled || showSpinner) ? "disabled" : "") }>
            <span>
                { (showSpinner ? <span className="gm-spinner"></span> : "")}
                { label }
            </span>
        </button>
    </div>
);
