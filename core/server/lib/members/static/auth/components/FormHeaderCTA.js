export default ({title, label, icon, hash}) => (
    <div className="gm-auth-cta">
        {title ? (<h4>{ title }</h4>) : ""}
        <a href={hash}>
            { label }
            { icon }
        </a>
    </div>
);
