export default ({onClick, label}) => (
    <div className="mt6">
        <button type="submit" className="gm-btn-blue" onClick={onClick}>
            { label }
        </button>
    </div>
);
