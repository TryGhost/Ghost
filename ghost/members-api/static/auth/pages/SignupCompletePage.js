import FormHeader from '../components/FormHeader';
import FormSubmit from '../components/FormSubmit';
import { IconSignupComplete } from '../components/icons';
import Form from '../components/Form';

export default ({ error, handleSubmit, siteConfig }) => (
    <div className="gm-modal-form gm-signup-complete-page">
        <Form bindTo="signup" onSubmit={ handleSubmit }>
            <div class="flex flex-column items-center">
                <span>{ IconSignupComplete }</span>
                <h1 className="mt4">Sign up complete</h1>
                <p className="gm-thank-you">Thank you for signing up for { siteConfig.title }! Now you have access to the full content of the site.</p>
            </div>
            <FormSubmit label="Enjoy!" />
        </Form>
    </div>
);
