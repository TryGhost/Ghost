import React, { Component } from 'react';
import { Elements, StripeProvider } from 'react-stripe-elements';
import CheckoutForm from './CheckoutForm';

class CustomStripeProvider extends Component {
  render({ publicKey }) {
    return (
      <StripeProvider apiKey={publicKey}>
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