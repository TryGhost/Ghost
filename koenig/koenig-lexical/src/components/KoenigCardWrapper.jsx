const KoenigCardWrapperComponent = ({children}) => {
    return (
        <div className="caret-grey-800 hover:shadow-green relative hover:shadow-[0_0_0_1px]" data-kg-card>
            {children}
        </div>
    );
};

export default KoenigCardWrapperComponent;
