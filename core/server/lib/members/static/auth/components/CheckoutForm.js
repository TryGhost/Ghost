import React, { Component } from 'react';
import { CardElement } from 'react-stripe-elements';

class CheckoutForm extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        let style = {
            base: {
                '::placeholder': {
                    color: '#8795A1',
                    fontSize: '15px'
                }
            },
            invalid: {
                '::placeholder': {
                    color: 'rgba(240, 82, 48, 0.75)'
                }
            }
        };
        return (
            <div className="gm-form-element">
                <CardElement style={ style } />
            </div>
        );
    }
}

export default CheckoutForm;
