import AppContext from '../../AppContext';
import CopyToClipboard from '../../utils/copy-to-clipboard';
const React = require('react');

export const LinkPageStyles = `
    .gh-portal-links-table {
        width: 100%;
    }

    .gh-portal-links-table tr td {
        white-space: nowrap;
        padding: 4px 12px 4px 0;
    }

    .gh-portal-links-table tr.header td {
        border-bottom: 1px solid var(--grey12);
    }

    .gh-portal-links-table tr.header h4.toggle {
        font-weight: 400;
        color: var(--brandcolor);
        cursor: pointer;
    }

    .gh-portal-links-table tr td:last-of-type {
        text-align: right;
        padding-right: 0;
    }

    .gh-portal-links-table tr.header .toggle-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
`;

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

const LinkAttributeToggle = ({showLinks, toggleShowLinks}) => {
    const text = showLinks ? 'Show Data Attributes' : 'Show Links';
    return (
        <h4 className='gh-portal-links-cell toggle' onClick={() => toggleShowLinks({showLinks: !showLinks})}>{text}</h4>
    );
};

const LinkAttributeRow = ({pageName, page, isLink, siteUrl}) => {
    const value = getLinkOrAttribute({page, isLink, siteUrl});
    return (
        <tr>
            <td className='pagename'>{pageName}</td>
            <td className='page-url'><input value={value} disabled="disabled" /></td>
            <td className='copy'>
                <button type="button" onClick={(e) => {
                    CopyToClipboard(value);
                }}>Copy</button>
            </td>
        </tr>
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
        const {url: siteUrl = ''} = this.context.site;
        return (
            <div className='gh-portal-links-main'>
                <p>Use these links or data attributes to show the various sections of members modal.</p>
                <table className='gh-portal-links-table'>
                    <tr className='header'>
                        <td><h4>Section</h4></td>
                        <td colspan='2'>
                            <div className='toggle-header'>
                                <h4>{this.state.showLinks ? 'Link' : 'Data Attribute'}</h4>
                                <LinkAttributeToggle showLinks={this.state.showLinks} toggleShowLinks={({showLinks}) => this.setState({showLinks})}/>
                            </div>
                        </td>
                    </tr>
                    <LinkAttributeRow pageName="Default" page="default" isLink={this.state.showLinks} siteUrl={siteUrl} />
                    <LinkAttributeRow pageName="Sign up" page="signup" isLink={this.state.showLinks} siteUrl={siteUrl} />
                    <LinkAttributeRow pageName="Sign in" page="signin" isLink={this.state.showLinks} siteUrl={siteUrl} />
                    <LinkAttributeRow pageName="Account home" page="accountHome" isLink={this.state.showLinks} siteUrl={siteUrl} />
                    <LinkAttributeRow pageName="Account/Plans" page="accountPlan" isLink={this.state.showLinks} siteUrl={siteUrl} />
                    <LinkAttributeRow pageName="Account/Profile" page="accountProfile" isLink={this.state.showLinks} siteUrl={siteUrl} />
                </table>
            </div>
        );
    }
}
