import Form from '../components/Form';
import FormHeader from '../components/FormHeader';
import FormHeaderCTA from '../components/FormHeaderCTA';
import FormSubmit from '../components/FormSubmit';

import NameInput from '../components/NameInput';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';
import { IconClose } from '../components/icons';

export default ({ error, handleClose, handleSubmit }) => (
    <div className="gm-modal-form gm-signup-page">
        <FormHeader title="" error={error} errorText="Email already registered">
            <div className="flex justify-between items-baseline">
                <h1>Sign up</h1>
                <FormHeaderCTA title="Already a member?" label="Log in" hash="#signin" />
            </div>
        </FormHeader>
        <Form onSubmit={handleSubmit}>
            <NameInput bindTo="name" className="first" />
            <EmailInput bindTo="email" />
            <PasswordInput bindTo="password" className="last" />
            <FormSubmit label="Sign up" />
        </Form>
    </div>
);
