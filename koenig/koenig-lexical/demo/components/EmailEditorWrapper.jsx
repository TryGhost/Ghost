import React from 'react';

const EmailEditorWrapper = ({children}) => {
    return (
        <div>
            <div className="mb-6">
                <div className="flex items-center py-2 text-sm">
                    <span className="w-20 font-semibold">From:</span>
                    <span className="text-gray-500">Ghost &lt;noreply@example.com&gt;</span>
                </div>
                <div className="flex items-center py-2 text-sm">
                    <span className="w-20 font-semibold">Subject:</span>
                    <span className="text-gray-500">Welcome to Ghost</span>
                </div>
            </div>
            <div className="p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
                {children}
            </div>
        </div>
    );
};

export default EmailEditorWrapper;
