import { useEffect, useState } from 'react';

// Tailwind's xl breakpoint: wide enough for the list and a 400px rail side by side
const QUERY = '(min-width: 1280px)';

export function useWideLayout() {
  const [wide, setWide] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setWide(mql.matches);
    mql.addEventListener('change', onChange);
    onChange();
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return wide;
}
