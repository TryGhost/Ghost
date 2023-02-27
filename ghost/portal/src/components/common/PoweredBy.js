import React from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as GhostLogo} from '../../images/ghost-logo-small.svg';

export default class PoweredBy extends React.Component {
    static contextType = AppContext;

    render() {
        const {t} = this.context;

        return (
            <a href='https://ghost.org' target='_blank' rel='noopener noreferrer' onClick={() => {
                window.open('https://ghost.org', '_blank');
            }}>
                <GhostLogo />
                {t('Powered by Ghost')}
            </a>
        );
    }
}
