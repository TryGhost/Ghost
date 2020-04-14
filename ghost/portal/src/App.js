import React from 'react';
import './App.css';
import ParentContainer from './components/ParentContainer';

function App(props) {
    return (
        <div className="App">
            <ParentContainer data={props.data} />
        </div>
    );
}

export default App;
