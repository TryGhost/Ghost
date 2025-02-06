import {useEffect, useState} from 'react';

interface AnimatedCounterResult {
    displayValue: React.ReactNode;
    increment: () => void;
    decrement: () => void;
}

const splitNumber = (num: number): string[] => num.toString().split('');

export const useAnimatedCounter = (initialValue: number): AnimatedCounterResult => {
    const [value, setValue] = useState(initialValue);
    const [digits, setDigits] = useState(splitNumber(initialValue));
    const [animatingDigits, setAnimatingDigits] = useState<Set<number>>(new Set());
    const [isDecrementing, setIsDecrementing] = useState(false);

    useEffect(() => {
        const newDigits = splitNumber(value);
        const changedPositions = new Set(
            [...Array(Math.max(digits.length, newDigits.length))].map((_, i) => {
                return digits[i] !== newDigits[i] ? i : -1;
            }).filter(i => i !== -1)
        );

        if (changedPositions.size > 0) {
            setAnimatingDigits(changedPositions);

            const timeout = setTimeout(() => {
                setDigits(newDigits);
                setAnimatingDigits(new Set());
                setIsDecrementing(false);
            }, 300);

            return () => clearTimeout(timeout);
        }
    }, [value, digits]);

    const updateValue = (delta: number) => {
        setValue(prev => prev + delta);
        setIsDecrementing(delta < 0);
    };

    return {
        displayValue: (
            <span className="flex">
                {digits.map((digit, position) => (
                    <span
                        key={`${digits.length - position}-${digit}`}
                        className={animatingDigits.has(position)
                            ? isDecrementing ? 'animate-slide-down' : 'animate-slide-up'
                            : ''}
                    >
                        {digit}
                    </span>
                ))}
            </span>
        ),
        increment: () => updateValue(1),
        decrement: () => updateValue(-1)
    };
};
