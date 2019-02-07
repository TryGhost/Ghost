import './styles/members.css';
import { Component } from 'preact';

import MembersProvider from './components/MembersProvider';
import Modal from './components/Modal';

export default class App extends Component {
    constructor() {
        super();
        const apiUrl = window.location.href.substring(0, window.location.href.indexOf('/members/auth'));

        this.state = {
            apiUrl
        };
    }

    render() {
        return (
            <MembersProvider apiUrl={ this.state.apiUrl }>
                 <Modal />
            </MembersProvider>
        );
    }
}
