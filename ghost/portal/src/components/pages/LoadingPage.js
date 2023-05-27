import React from 'react';
import {ReactComponent as LoaderIcon} from '../../images/icons/loader.svg';

export default class LoadingPage extends React.Component {
    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                <div style={{paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', height: '50px'}}>
                    <LoaderIcon className={'gh-portal-loadingicon dark'} />
                </div>
            </div>
        );
    }
}
