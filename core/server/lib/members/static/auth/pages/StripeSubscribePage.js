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

    onClick = () => {
        this.props.stripe.createToken({ name: name });
    }

    render() {
        return (
            <Form bindTo="request-password-reset" onSubmit={(data) => this.handleSubmit(data)}>
                <NameInput bindTo="name" className="first" />
                <EmailInput bindTo="email" />
                <PasswordInput bindTo="password" />
                <CheckoutForm />
                <FormSubmit label="Confirm payment" onClick={() => this.onClick()}/>
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
        const dollarAmount = (amount / 100);
        return (
            <label for={ id }>
                <div className={ (selectedPlanId === id ? "gm-plan selected" : "gm-plan") }>
                    <input type="radio" id={id} name="radio-group" value={id} defaultChecked={id === selectedPlanId} />
                    <span className="gm-amount">{`$${dollarAmount}`}</span>
                    <span className="gm-interval"><span className="gm-currency">{ `${currency}` }</span> {`${interval}`}</span>
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

    renderPlans(plans, title, iconStyle) {
        return (
            <div className="gm-plans" onChange={(e) => this.changePlan(e)}>
                <div className="gm-publication-info">
                    <div className="gm-logo" style={iconStyle}></div>
                    <div className="gm-publication-name">
                        <h2>{title}</h2>
                        <span>Subscription</span>
                    </div>
                </div>
                {
                    plans.map((plan) => this.renderPlan(plan))
                }
            </div>
        );
    }

    renderPlansSection(title, iconStyle) {
        return (
            <div className="gm-plans-container">
                {this.renderPlans(this.plans, title, iconStyle)}
            </div>
        )
    }

    render({ error, handleSubmit, stripeConfig, siteConfig }) {
        const publicKey = stripeConfig.config.publicKey || '';
        let iconUrl = siteConfig && siteConfig.icon;
        let title = (siteConfig && siteConfig.title) || "Ghost Publication";
        let iconStyle = iconUrl ? {
            backgroundImage: `url(${iconUrl})`,
            backgroundSize: `44px`
        } : {};
        return (
            <div class="gm-subscribe-page">
                <div className="gm-subscribe-form-wrapper">
                    <div className="gm-modal-form gm-subscribe-form">
                        <FormHeader title="Subscribe" error={ error } errorText={ error } />
                        <StripeProvider apiKey={publicKey}>
                            <Elements>
                                <PaymentFormWrapped handleSubmit={handleSubmit} publicKey={publicKey} selectedPlan={this.state.selectedPlan} />
                            </Elements>
                        </StripeProvider>
                        <div className="flex justify-center mt4">
                            <FormHeaderCTA title="Already a member?" label="Log in" hash="#signin" />
                        </div>
                    </div>
                    <div class="gm-plans-divider"></div>
                    {this.renderPlansSection(title, iconStyle)}
                </div>
            </div>
        )
    }
};
