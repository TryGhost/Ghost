interface DarkModeToggleProps {
    darkMode: boolean;
    toggleDarkMode: () => void;
}

const DarkModeToggle = ({darkMode, toggleDarkMode}: DarkModeToggleProps) => {
    return (
        <>
            <button className="absolute right-20 top-4 z-20 block h-[22px] w-[42px] cursor-pointer rounded-full transition-all ease-in-out" type="button" onClick={toggleDarkMode}>
                {darkMode ? '🌚' : '🌞'}
            </button>
        </>
    );
};

export default DarkModeToggle;
