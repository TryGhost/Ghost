import {useOrderChange} from '../../../AppContext';

export const SortingForm = () => {
    const changeOrder = useOrderChange();
    
    const options = [
        {value: 'best', label: 'Best'},
        {value: 'newest', label: 'Newest'},
        {value: 'oldest', label: 'Oldest'}
    ];

    const handleOrderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const order = event.target.value;
        changeOrder(order);
    };

    return (
        <select onChange={handleOrderChange}>
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
};
