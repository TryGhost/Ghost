export default ({title, label, hash}) => (
    <div className="flex items-baseline mt2">
        <h4>{ title }</h4>
        <a href={hash}>
            { label }
        </a>
    </div>
);
