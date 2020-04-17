const React = require('react');

export default class LoadingPage extends React.Component {
    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                <div style={{paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px'}}>
                    Loading...
                </div>
            </div>
        );
    }
}
