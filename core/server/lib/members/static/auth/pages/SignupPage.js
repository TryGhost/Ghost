import Form from '../components/Form';
import FormHeader from '../components/FormHeader';
import FormHeaderCTA from '../components/FormHeaderCTA';
import FormSubmit from '../components/FormSubmit';

import NameInput from '../components/NameInput';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';
import { IconClose } from '../components/icons';

export default ({ error, handleClose, handleSubmit }) => (
    <div className="gm-modal-form">
        <FormHeader title="Sign up" error={error} errorText="Email already registered">
            <FormHeaderCTA title="Already a member?" label="Log in" hash="#signin" />
        </FormHeader>
        <Form onSubmit={handleSubmit}>
            <NameInput bindTo="name" />
            <EmailInput bindTo="email" />
            <PasswordInput bindTo="password" />
            <FormSubmit label="Sign up" />
        </Form>
    </div>
);
