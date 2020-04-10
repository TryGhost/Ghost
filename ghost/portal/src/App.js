import React from 'react';
import './App.css';
import ParentContainer from './components/ParentContainer';

function App(props) {
    return (
        <div className="App">
            <ParentContainer name="MembersJS" data={props.data} />
        </div>
    );
}

export default App;
