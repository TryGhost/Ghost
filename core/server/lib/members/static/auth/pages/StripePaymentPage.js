import FormHeader from '../components/FormHeader';
import StripeProvider from '../components/StripeProvider';
import FormSubmit from '../components/FormSubmit';
import FormHeaderCTA from '../components/FormHeaderCTA';
import { IconClose } from '../components/icons';
import NameInput from '../components/NameInput';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';

import Form from '../components/Form';

const renderPlan = ({ currency, amount, id, interval }) => {
    return (
        <div>
            <span> {`${amount}`}</span>
            <span> {`/${interval}`}</span>
        </div>
    )
}

const renderPlans = ({ plans }) => {
    return (
        <div>
            {
                plans.map((plan) => renderPlan(plan))
            }
        </div>
    );
}

export default ({ error, handleClose, handleSubmit, stripeConfig }) => {
    const plans = stripeConfig.config.plans || [];

    console.log("Plans", plans);
    return (
        <div className="gm-modal-container">
            <div className="gm-modal gm-auth-modal gm-subscribe-modal" onClick={(e) => e.stopPropagation()}>
                <a className="gm-modal-close" onClick={handleClose}>{IconClose}</a>
                <div style={{ display: "flex" }}>
                    <div style={{ width: "300px", padding: "20px" }}>
                        <FormHeader title="Subscribe" error={error} errorText="Unable to confirm payment">
                            <FormHeaderCTA title="Already a member?" label="Log in" hash="#signin" />
                        </FormHeader>
                        <Form bindTo="request-password-reset" onSubmit={handleSubmit}>
                            <NameInput bindTo="name" />
                            <EmailInput bindTo="email" />
                            <PasswordInput bindTo="password" />
                            <StripeProvider />
                            <FormSubmit label="Confirm Payment" />
                        </Form>
                    </div>
                    <div style={{ border: "1px solid black" }}></div>
                    <div style={{ padding: "20px", width: "295px", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
                        <div className="gm-logo"></div>
                        <div className="separator"> </div>
                        {renderPlans({plans})}
                    </div>
                </div>
            </div>
        </div>
    )
};
