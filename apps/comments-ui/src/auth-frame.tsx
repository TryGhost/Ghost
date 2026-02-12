type Props = {
    adminUrl: string;
    onLoad: () => void;
    onError: () => void;
};

const AuthFrame: React.FC<Props> = ({adminUrl, onLoad, onError}) => {
    return (
        <iframe
            data-frame="admin-auth"
            src={adminUrl + 'auth-frame/'}
            style={{display: 'none'}}
            title="auth-frame"
            onError={onError}
            onLoad={onLoad}
        />
    );
};

export default AuthFrame;
