const KoenigCardWrapperComponent = ({children}) => {
    return (
        <div className="relative caret-grey-800 hover:shadow-[0_0_0_1px] hover:shadow-green" data-kg-card>
            {children}
        </div>
    );
};

export default KoenigCardWrapperComponent;
