import {offer} from '../../utils/fixtures';
const React = require('react');

export default class OfferPage extends React.Component {
    render() {
        return (
            <div className='gh-portal-content'>
                <div style={{paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px'}}>
                    Offer - {offer.name}
                </div>
            </div>
        );
    }
}
