import { Component } from 'preact';

const states = {};

export default class Form extends Component {

    constructor(props) {
        super(props);
        const includeData = props.includeData || {};

        if (props.bindTo) {
            if (states[props.bindTo]) {
                this.state = states[props.bindTo]
                this.state.data = { ...this.state.data, ...includeData };
            } else {
                states[props.bindTo] = this.state = {
                    submitted: false,
                    data: {...includeData}
                }
            }
        } else {
            this.state = {
                submitted: false,
                data: {...includeData}
            }
        }
    }

    wrapChildren(children, data, onInput = () => {}) {
        return children.map(child => {
            const { bindTo } = child.attributes || {};
            if (bindTo) {
                child.attributes.value = data[bindTo];
                child.attributes.onInput = (e) => {
                    // This is a hack
                    // Preact keeps copy of the child attributes to know whether to rerender
                    // The state change below will for a check, and the old attributes will be reused
                    child.attributes.error = false;
                    this.setState({
                        submitted: false,
                        data: Object.assign({}, this.state.data, {
                            [bindTo]: e.target.value
                        })
                    });
                }

                if (this.state.submitted && !data[bindTo]) {
                    child.attributes.error = true;
                }
            }
            return child;
        })
    }

    wrapSubmit(onSubmit = () => {}, children, data) {
        return (e) => {
            e.preventDefault();

            const requiredFields = children.map(c => c.attributes.bindTo).filter(x => !!x)
            if (!requiredFields.some(x => !data[x])) {
                onSubmit(this.state.data)
            }
            this.setState({
                submitted: true
            });
        }
    }

    render({bindTo, children, onInput, onSubmit}, state) {
        if (bindTo) {
            states[bindTo] = state;
        }
        const data = state.data;
        return (
            <div className="flex flex-column mt7">
                <form className="gm-signup-form" onSubmit={this.wrapSubmit(onSubmit, children, data)} noValidate>
                    { this.wrapChildren(children, data, onInput) }
                </form>
            </div>
        );
    }
}
