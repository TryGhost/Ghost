import { Elements, StripeProvider, injectStripe } from 'react-stripe-elements';
import { Component } from 'react';
import FormHeader from '../components/FormHeader';
import FormSubmit from '../components/FormSubmit';
import FormHeaderCTA from '../components/FormHeaderCTA';
import { IconClose } from '../components/icons';
import NameInput from '../components/NameInput';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';
import CheckoutForm from '../components/CheckoutForm';
import Form from '../components/Form';


class PaymentForm extends Component {

    constructor(props) {
        super(props);
    }

    handleSubmit = ({ name, email, password, plan = "Monthly" }) => {
        // Within the context of `Elements`, this call to createToken knows which Element to
        // tokenize, since there's only one in this group.

        this.props.stripe.createToken({ name: name }).then(({ token }) => {
            this.props.handleSubmit({
                adapter: 'stripe',
                plan: plan,
                stripeToken: token.id,
                name, email, password
            });
        });
    };

    render() {
        return (
            <Form bindTo="request-password-reset" onSubmit={(data) => this.handleSubmit(data)}>
                <NameInput bindTo="name" />
                <EmailInput bindTo="email" />
                <PasswordInput bindTo="password" />
                <input id="prodId" name="prodId" type="hidden" value="xm234jq" />
                <CheckoutForm />

                <FormSubmit label="Confirm Payment" />
            </Form>
        );
    }
}

const PaymentFormWrapped = injectStripe(PaymentForm);

export default class StripePaymentPage extends Component {
    constructor(props) {
        super(props);
        this.plans = props.stripeConfig.config.plans || [];
        this.state = {
            plan: this.plans[0] ? this.plans[0] : ""
        }
    }

    renderPlan({ currency, amount, id, interval, name }) {
        return (
            <div>
                <input type="radio" id={id} name="radio-group" />
                <label for={id}>
                    <span> {`${amount}`}</span>
                    <span> {`/${interval}`}</span>
                </label>
            </div>
        )
    }

    renderPlans(plans) {
        return (
            <div>
                {
                    plans.map((plan) => this.renderPlan(plan))
                }
            </div>
        );
    }

    render({ error, handleClose, handleSubmit, stripeConfig }) {
        const publicKey = stripeConfig.config.publicKey || '';
        return (
            <div className="gm-modal-container">
                <div className="gm-modal gm-auth-modal gm-subscribe-modal" onClick={(e) => e.stopPropagation()}>
                    <a className="gm-modal-close" onClick={handleClose}>{IconClose}</a>
                    <div style={{ display: "flex" }}>
                        <div style={{ width: "300px", padding: "20px" }}>
                            <FormHeader title="Subscribe" error={error} errorText="Unable to confirm payment">
                                <FormHeaderCTA title="Already a member?" label="Log in" hash="#signin" />
                            </FormHeader>
                            <StripeProvider apiKey={publicKey}>
                                <Elements>
                                    <PaymentFormWrapped handleSubmit={handleSubmit} publicKey={publicKey} plan={this.state.plan} />
                                </Elements>
                            </StripeProvider>
                        </div>
                        <div style={{ border: "1px solid black" }}></div>
                        <div style={{ padding: "20px", width: "295px", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
                            <div className="gm-logo"></div>
                            <div className="separator"> </div>
                            {this.renderPlans(this.plans)}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
};
