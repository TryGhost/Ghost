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
        let planStyle = {
            padding: "12px",
            border: "1px solid #e2e8ed",
            borderRadius: "6px",
            marginBottom: "12px",
            marginTop: "12px",
            display: 'flex',
            alignItems: 'center',
            width: "200px"
        };
        return (
            <div style={planStyle}>
                <input type="radio" id={id} name="radio-group" value={id} />
                <label for={id}>
                    <span style={{fontSize: "24px", marginLeft: "9px"}}> {`$${amount}`}</span>
                    <span style={{padding: "0px 1px", color: "#77919c"}}> / </span>
                    <span style={{color: "#77919c"}}> {`${interval}`}</span>
                </label>
            </div>
        )
    }

    changePlan(e) {
        const plan = this.plans.filter(plan => plan.id === e.target.value);
        console.log("e", e, e.target, e.target.value);
        this.setState({
            plan: plan
        })
    }

    renderPlans(plans) {
        return (
            <div onChange={(e) => this.changePlan(e)}>
                {
                    plans.map((plan) => this.renderPlan(plan))
                }
            </div>
        );
    }

    renderPlansSection() {
        const separatorStyle = {
            height: "1px",
            borderTop: "2px solid #e7f0f6",
            width: "180px",
            margin: "12px 0"
        }
        return (
            <div style={{ padding: "20px", width: "295px", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", background: "#fcfdfd" }}>
                <div style={{display: "flex", alignItems: "center"}}>
                    <div className="gm-logo"></div>
                    <div style={{display: "flex", flexDirection: "column", paddingLeft: "12px"}}>
                        <span style={{fontSize: "16px", fontWeight: "bold"}}> The Blueprint</span>
                        <span style={{fontSize: "14px", color: "#9cb2bc", marginTop: "3px"}}> Subscription</span>
                    </div>
                </div>
                <div className="separator" style={separatorStyle}> </div>
                {this.renderPlans(this.plans)}
            </div>
        )
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
                        {this.renderPlansSection()}
                    </div>
                </div>
            </div>
        )
    }
};
