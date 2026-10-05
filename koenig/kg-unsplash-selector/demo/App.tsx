import React, { useState } from 'react';
import { DefaultHeaderTypes, UnsplashSearchModal } from '../src/index';

const App = () => {
  const [insertedCaption, setInsertedCaption] = useState<string | null>(null);
  let unsplashConfig: DefaultHeaderTypes | null = {
    Authorization: `Client-ID 8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980`,
    'Accept-Version': 'v1',
    'Content-Type': 'application/json',
    'App-Pragma': 'no-cache',
    'X-Unsplash-Cache': true,
  };

  // disable API access for testing
  if (import.meta.env.VITE_APP_TESTING === 'true') {
    unsplashConfig = null;
  }

  return (
    <div>
      <UnsplashSearchModal
        unsplashProviderConfig={unsplashConfig}
        onClose={() => {
          alert('not implemented');
        }}
        onImageInsert={(image) => setInsertedCaption(image.caption)}
      />
      {insertedCaption && (
        <p dangerouslySetInnerHTML={{ __html: insertedCaption }} data-testid="inserted-caption" />
      )}
    </div>
  );
};

export default App;
