import AppContext from '../../AppContext';
import CopyToClipboard from '../../utils/copy-to-clipboard';
const React = require('react');

function getLinkOrAttribute({page, isLink, siteUrl}) {
    if (page === 'default') {
        return (isLink ? `${siteUrl}#/portal` : 'data-portal');
    } else if (page === 'signup') {
        return (isLink ? `${siteUrl}#/portal/signup` : `data-portal="signup"`);
    } else if (page === 'signin') {
        return (isLink ? `${siteUrl}#/portal/signin` : `data-portal="signin"`);
    } else if (page === 'accountHome') {
        return (isLink ? `${siteUrl}#/portal/account` : `data-portal="account"`);
    } else if (page === 'accountPlan') {
        return (isLink ? `${siteUrl}#/portal/account/plans` : `data-portal="account/plans"`);
    } else if (page === 'accountProfile') {
        return (isLink ? `${siteUrl}#/portal/account/profile` : `data-portal="account/profile"`);
    }
}

const LinkAttributeValue = ({page, isLink, siteUrl}) => {
    const rightItemStyle = {
        paddingBottom: '24px',
        display: 'flex'
    };
    const value = getLinkOrAttribute({page, isLink, siteUrl});
    return (
        <div style={rightItemStyle}>
            <span style={{
                flexGrow: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                paddingRight: '12px'
            }}> {value} </span>
            <button type="button" onClick={(e) => {
                CopyToClipboard(value);
            }}> Copy </button>
        </div>
    );
};

const LinkAttributeSection = ({siteUrl, showLinks: isLink, toggleShowLinks}) => {
    return (
        <div style={{flexGrow: 1, minWidth: '350px'}}>
            <div style={{display: 'flex', borderBottom: '1px solid black', marginBottom: '12px'}}>
                <span style={{flexGrow: 1, fontWeight: 'bold'}}> {isLink ? 'Link' : 'Data Attribute'} </span>
                <LinkAttributeToggle showLinks={isLink} toggleShowLinks={toggleShowLinks}/>
            </div>
            <LinkAttributeValue page="default" isLink={isLink} siteUrl={siteUrl} />
            <LinkAttributeValue page="signup" isLink={isLink} siteUrl={siteUrl} />
            <LinkAttributeValue page="signin" isLink={isLink} siteUrl={siteUrl} />
            <LinkAttributeValue page="accountHome" isLink={isLink} siteUrl={siteUrl} />
            <LinkAttributeValue page="accountPlan" isLink={isLink} siteUrl={siteUrl} />
            <LinkAttributeValue page="accountProfile" isLink={isLink} siteUrl={siteUrl} />
        </div>
    );
};

const LinkAttributeToggle = ({showLinks, toggleShowLinks}) => {
    const text = showLinks ? 'Show Data Attributes' : 'Show Links';
    return (
        <span
            style={{cursor: 'pointer', color: '#3eb0ef'}}
            onClick={() => toggleShowLinks({showLinks: !showLinks})}> {text}
        </span>
    );
};

export default class LinkPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            showLinks: true
        };
    }

    render() {
        const itemStyle = {
            paddingRight: '32px',
            paddingBottom: '24px'
        };
        const {url: siteUrl = ''} = this.context.site;
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131', padding: '12px 24px'}}>
                <div> Use these links or data attributes to show the various sections of members modal.</div>
                <div style={{display: 'flex', marginTop: '12px'}}>
                    <div style={{flexShrink: 0}}>
                        <div style={{borderBottom: '1px solid black', marginBottom: '12px', fontWeight: 'bold'}}> Section </div>
                        <div style={itemStyle}> Default </div>
                        <div style={itemStyle}> Signup </div>
                        <div style={itemStyle}> Signin </div>
                        <div style={itemStyle}> Account home </div>
                        <div style={itemStyle}> Account -&gt; Plans </div>
                        <div style={itemStyle}> Account -&gt; Profile </div>
                    </div>
                    <LinkAttributeSection
                        showLinks={this.state.showLinks}
                        toggleShowLinks={({showLinks}) => this.setState({showLinks})}
                        siteUrl={siteUrl}
                    />
                </div>
            </div>
        );
    }
}
