export default ({onClick, label}) => (
    <div className="mt7">
        <button type="submit" className="gm-btn-blue" onClick={onClick}>
            { label }
        </button>
    </div>
);
