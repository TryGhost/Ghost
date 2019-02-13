import React, {Component} from 'react';
import {CardElement, injectStripe} from 'react-stripe-elements';
import FormSubmit from './FormSubmit';

class CheckoutForm extends Component {
  constructor(props) {
    super(props);
    this.submit = this.submit.bind(this);
  }

  submit(ev) {
    let {token} = this.props.stripe.createToken({name: "Name"}).then(({token}) => {
        this.props.createSubscription({
            adapter: 'stripe',
            plan: 'Monthly',
            stripeToken: token.id
        });
    });

    // User clicked submit
  }

  render() {
    return (
      <div className="gm-form-element">
        <CardElement />
      </div>
    );
  }
}

export default injectStripe(CheckoutForm);