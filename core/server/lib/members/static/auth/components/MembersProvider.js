import { Component } from 'preact';

const layer0 = require('../layer0');

export default class MembersProvider extends Component {
    constructor() {
        super();
        this.setGatewayFrame = gatewayFrame => this.gatewayFrame = gatewayFrame;
        this.ready = new Promise((resolve) => {
            this.setReady = resolve;
        })
        this.gateway = null;
    }

    getChildContext() {
        return {
            members: {
                createSubscription: this.createMethod('createSubscription'),
                signin: this.createMethod('signin'),
                signup: this.createMethod('signup'),
                requestPasswordReset: this.createMethod('requestPasswordReset'),
                resetPassword: this.createMethod('resetPassword'),
                getConfig: this.createMethod('getConfig'),
            }
        };
    }

    render({apiUrl, children}) {
        const src = `${apiUrl}/members/gateway`;
        return (
            <div>
                { children }
                <iframe src={src} ref={this.setGatewayFrame} id="members-gateway" style="display: none;"/>
            </div>
        );
    }

    componentDidMount() {
        const gatewayFrame = this.gatewayFrame;
        gatewayFrame.addEventListener('load', () => {
            this.gateway = layer0(gatewayFrame)
            this.setReady();
        });
    }

    createMethod(method) {
        return (options) => {
            return this.ready.then(() => {
                return new Promise((resolve, reject) => {
                    this.gateway.call(method, options, (err, successful) => {
                        if (err || !successful) {
                            reject(err || !successful);
                        }
                        resolve(successful);
                    })
                });
            });
        }
    }

}
