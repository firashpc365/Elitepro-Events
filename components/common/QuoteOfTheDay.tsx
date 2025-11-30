import React, { useState, useEffect } from 'react';

interface QuoteOfTheDayProps {
    quotes: string[];
}

export const QuoteOfTheDay: React.FC<QuoteOfTheDayProps> = ({ quotes }) => {
    const [quote, setQuote] = useState('');

    useEffect(() => {
        if (quotes && quotes.length > 0) {
            const randomIndex = Math.floor(Math.random() * quotes.length);
            setQuote(quotes[randomIndex]);
        }
    }, [quotes]);

    if (!quote) {
        return null;
    }

    return (
        <p className="text-sm text-slate-400 italic">"{quote}"</p>
    );
};