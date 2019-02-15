import Form from '../components/Form';
import FormHeader from '../components/FormHeader';
import FormHeaderCTA from '../components/FormHeaderCTA';
import FormSubmit from '../components/FormSubmit';

import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';

export default ({ error, handleSubmit }) => (
    <div>
        <FormHeader title="Log in" error={error} errorText="Wrong email or password">
            <FormHeaderCTA title="Not a member?" label="Sign up" hash="#signup" />
        </FormHeader>
        <Form onSubmit={handleSubmit}>
            <EmailInput bindTo="email" />
            <PasswordInput bindTo="password" className="gm-forgot-input">
                <a href="#request-password-reset" className="gm-forgot-link">
                    Forgot
                    </a>
            </PasswordInput>
            <FormSubmit label="Log in" />
        </Form>
    </div>
);
