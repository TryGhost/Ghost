type Props = {
    adminUrl: string|undefined;
    onLoad: () => void;
};
const AuthFrame: React.FC<Props> = ({adminUrl, onLoad}) => {
    const iframeStyle = {
        display: 'none'
    };

    return (
        <iframe data-frame="admin-auth" src={adminUrl + 'auth-frame/'} style={iframeStyle} title="auth-frame" onLoad={onLoad}></iframe>
    );
};
export default AuthFrame;
