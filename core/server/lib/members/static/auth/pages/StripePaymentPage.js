import { Elements, StripeProvider, injectStripe } from 'react-stripe-elements';
import { Component } from 'react';
import FormHeader from '../components/FormHeader';
import FormSubmit from '../components/FormSubmit';
import FormHeaderCTA from '../components/FormHeaderCTA';
import NameInput from '../components/NameInput';
import EmailInput from '../components/EmailInput';
import PasswordInput from '../components/PasswordInput';
import CheckoutForm from '../components/CheckoutForm';
import Form from '../components/Form';


class PaymentForm extends Component {

    constructor(props) {
        super(props);
    }

    handleSubmit = ({ name, email, password, plan }) => {
        // Within the context of `Elements`, this call to createToken knows which Element to
        // tokenize, since there's only one in this group.
        plan = this.props.selectedPlan ? this.props.selectedPlan.name : "";
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
                <CheckoutForm />
                <FormSubmit label="Confirm payment" />
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
            selectedPlan: this.plans[0] ? this.plans[0] : ""
        }
    }

    renderPlan({ currency, amount, id, interval, name }) {
        const selectedPlanId = this.state.selectedPlan ? this.state.selectedPlan.id : "";
        return (
            <div class="gm-plan">
                <input type="radio" id={id} name="radio-group" value={id} defaultChecked={id === selectedPlanId} />
                <label for={id}>
                    <span class="gm-amount">{`$${amount/100}`}</span>
                    <span class="gm-interval">{`${interval}`}</span>
                </label>
            </div>
        )
    }

    changePlan(e) {
        const plan = this.plans.find(plan => plan.id === e.target.value);
        this.setState({
            selectedPlan: plan
        })
    }

    renderPlans(plans) {
        return (
            <div className="gm-plans" onChange={(e) => this.changePlan(e)}>
                {
                    plans.map((plan) => this.renderPlan(plan))
                }
            </div>
        );
    }

    renderPlansSection() {
        return (
            <div className="gm-plans-container">
                <div className="gm-publication-info">
                    <div className="gm-logo"></div>
                    <div className="gm-publication-name">
                        <h2>Expensive Publication</h2>
                        <span>Subscription</span>
                    </div>
                </div>
                {this.renderPlans(this.plans)}
            </div>
        )
    }

    render({ error, handleSubmit, stripeConfig }) {
        const publicKey = stripeConfig.config.publicKey || '';
        return (
            <div className="flex">
                <div className="gm-modal-form gm-subscribe-form">
                    <FormHeader title="Subscribe" error={error} errorText="Unable to confirm payment">
                        <FormHeaderCTA title="Already a member?" label="Log in" hash="#signin" />
                    </FormHeader>
                    <StripeProvider apiKey={publicKey}>
                        <Elements>
                            <PaymentFormWrapped handleSubmit={handleSubmit} publicKey={publicKey} selectedPlan={this.state.selectedPlan} />
                        </Elements>
                    </StripeProvider>
                </div>
                {this.renderPlansSection()}
            </div>
        )
    }
};
