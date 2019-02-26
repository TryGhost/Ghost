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

    render({frameLocation}) {
        return (
            <Form onSubmit={(data) => this.handleSubmit(data)}>
                <CheckoutForm />

                <FormSubmit label="Confirm Payment" />
            </Form>
        );
    }
}

const PaymentFormWrapped = injectStripe(PaymentForm);

export default class StripeSubscriptionPage extends Component {
    constructor(props) {
        super(props);
        this.plans = props.stripeConfig.config.plans || [];
        this.state = {
            selectedPlan: this.plans[0] ? this.plans[0] : ""
        }
    }

    renderPlan({ currency, amount, id, interval, name }) {
        const selectedPlanId = this.state.selectedPlan ? this.state.selectedPlan.id : "";
        const dollarAmount = (amount / 100);
        return (
            <label for={ id }>
                <div className={ (selectedPlanId === id ? "gm-plan selected" : "gm-plan") }>
                    <input type="radio" id={ id } name="radio-group" value={ id } defaultChecked={ id === selectedPlanId } />
                    <span className="gm-amount">{ `$${dollarAmount}` }</span>
                    <span className="gm-interval"><span className="gm-currency">{ `${currency}` }</span> { `${interval}` }</span>
                </div>
            </label>
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
            <div className="mt3" onChange={(e) => this.changePlan(e)}>
                {
                    plans.map((plan) => this.renderPlan(plan))
                }
            </div>
        );
    }

    renderPlansSection() {
        return (
            <div className="gm-plans-container">
                <h2 className="gm-form-section">Billing period</h2>
                {this.renderPlans(this.plans)}
            </div>
        )
    }

    render({ error, handleSubmit, stripeConfig }) {
        const publicKey = stripeConfig.config.publicKey || '';
        return (
            <div class="gm-upgrade-page">
                <div className="gm-modal-form gm-subscribe-form">
                    <FormHeader title="Upgrade" error={error} errorText="Unable to confirm payment" />
                    <div className="flex flex-column justfiy-stretch mt7">
                        { this.renderPlansSection() }
                        <div className="mt4 nb3">
                            <h2 className="gm-form-section">Card details</h2>
                        </div>
                        <StripeProvider apiKey={publicKey}>
                            <Elements>
                                <PaymentFormWrapped handleSubmit={handleSubmit} publicKey={publicKey} selectedPlan={this.state.selectedPlan} />
                            </Elements>
                        </StripeProvider>
                    </div>
                </div>
            </div>
        )
    }
};
