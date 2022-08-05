const CardComponent = ({children, isSelected, ...props}) => {
    // TODO: add icon, action bar, classes etc
    const classes = [
        'hover:shadow-green-500',
        'hover:shadow-[0_0_0_1px]'
    ];

    if (isSelected) {
        classes.push('shadow-green-500 shadow-[0_0_0_2px]');
    }

    return (
        <div className={classes.join(' ')}>
            {children}
        </div>
    );
};

export default CardComponent;
