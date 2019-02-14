import React, {Component} from 'react';
import {CardElement} from 'react-stripe-elements';

class CheckoutForm extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="gm-form-element">
        <CardElement />
      </div>
    );
  }
}

export default CheckoutForm;