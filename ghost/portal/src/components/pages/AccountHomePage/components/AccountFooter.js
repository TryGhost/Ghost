const AccountFooter = ({onClose, handleSignout, supportAddress = ''}) => {
    const supportAddressMail = `mailto:${supportAddress}`;
    return (
        <footer className='gh-portal-account-footer'>
            <ul className='gh-portal-account-footermenu'>
                <li>
                    <button data-test-button="footer-signout" className='gh-portal-btn' name='logout' aria-label='logout' onClick={e => handleSignout(e)}>
                        Sign out
                    </button>
                </li>
            </ul>
            <div className='gh-portal-account-footerright'>
                <ul className='gh-portal-account-footermenu'>
                    <li>
                        <a data-test-link="footer-support" className='gh-portal-btn gh-portal-btn-branded' href={supportAddressMail} onClick={() => {
                            supportAddressMail && window.open(supportAddressMail);
                        }}>Contact support</a>
                    </li>
                </ul>
            </div>
        </footer>
    );
};

export default AccountFooter;
