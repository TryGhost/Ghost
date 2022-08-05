const CardComponent = ({children, ...props}) => {
    // TODO: add icon, action bar, classes etc

    return (
        <div className="card-component">
            {children}
        </div>
    );
};

export default CardComponent;
