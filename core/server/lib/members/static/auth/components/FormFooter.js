export default ({title, hash, label}) => (
    <div className="gm-auth-footer">
        <div className="flex items-baseline">
            <h4>{ title }</h4>
            <a href={hash}>
                { label }
            </a>
        </div>
    </div>
);
