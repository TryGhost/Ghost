import React, {Component} from 'react';
import {Elements, StripeProvider} from 'react-stripe-elements';
import CheckoutForm from './CheckoutForm';

class CustomStripeProvider extends Component {
  render() {
    return (
      <StripeProvider apiKey="pk_test_YYtbxcXrdafMe2uFa5rcv2C9">
        <div className="example">
          <Elements>
            <CheckoutForm />
          </Elements>
        </div>
      </StripeProvider>
    );
  }
}

export default CustomStripeProvider;