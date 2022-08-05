const CardComponent = ({children, isSelected, ...props}) => {
    // TODO: add icon, action bar, classes etc

    return (
        <div className="card-component">
            {children}
            <code>
                isSelected: {JSON.stringify(isSelected)}
            </code>
        </div>
    );
};

export default CardComponent;
