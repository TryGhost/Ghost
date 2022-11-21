import React from 'react';

export function UnsplashCard() {
    return (
        <>
            <div className="bg-black opacity-60 inset-0 h-[100vh]"></div>
            <div className="bg-white inset-8 rounded z-40 overflow-hidden absolute shadow-xl">
                <div className="flex flex-col h-full">
                    <header className="flex shrink-0 justify-between py-10 px-20 items-center">
                        <h1 className="text-black text-3xl font-bold font-sans">Unsplash</h1>
                    </header>
                </div>
            </div>
        </>
    );
}