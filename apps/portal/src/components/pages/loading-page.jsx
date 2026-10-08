import React from 'react';
import LoaderIcon from '../../images/icons/loader.svg?react';

export default class LoadingPage extends React.Component {
  render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', color: '#222427' }}>
        <div
          style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', height: '50px' }}
        >
          <LoaderIcon
            className="gh-portal-loadingicon dark absolute left-1/2 -ms-[19px] inline-block h-[31px] [&_path]:fill-black [&_rect]:fill-black"
            data-testid="loaderIcon"
          />
        </div>
      </div>
    );
  }
}
