import React, { useState } from 'react';
import { DefaultHeaderTypes, UnsplashSearchModal } from '../src/index';

// disable API access for testing
const unsplashConfig: DefaultHeaderTypes | null =
  import.meta.env.VITE_APP_TESTING === 'true'
    ? null
    : {
        Authorization: `Client-ID 8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980`,
        'Accept-Version': 'v1',
        'Content-Type': 'application/json',
        'App-Pragma': 'no-cache',
        'X-Unsplash-Cache': true,
      };

const App = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [insertedCaption, setInsertedCaption] = useState<string | null>(null);

  return (
    <div>
      {isOpen && (
        <UnsplashSearchModal
          unsplashProviderConfig={unsplashConfig}
          onClose={() => setIsOpen(false)}
          onImageInsert={(image) => setInsertedCaption(image.caption)}
        />
      )}
      {insertedCaption && (
        <p dangerouslySetInnerHTML={{ __html: insertedCaption }} data-testid="inserted-caption" />
      )}
    </div>
  );
};

export default App;
