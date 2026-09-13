import { createContext, useContext } from 'react';

const FilterBarContext = createContext(false);

const useFilterBarContext = () => useContext(FilterBarContext);

export { FilterBarContext, useFilterBarContext };
