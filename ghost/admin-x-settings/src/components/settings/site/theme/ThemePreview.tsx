import React from 'react';

const NewThemePreview: React.FC<{
    selectedTheme?: string;
}> = ({
    selectedTheme
}) => {
    return (
        <div>
            Preview {selectedTheme}
        </div>
    );
};

export default NewThemePreview;