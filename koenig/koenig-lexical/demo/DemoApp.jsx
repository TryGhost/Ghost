import {ReactComponent as ViteLogo} from './assets/vite.svg';
import {ReactComponent as ReactLogo} from './assets/react.svg';
import {CountButton} from '../src/';

function App() {
    return (
        <div className="App">
            <div>
                <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
                    <ViteLogo className="logo" alt="Vite logo" />
                </a>
                <a href="https://reactjs.org" target="_blank" rel="noreferrer">
                    <ReactLogo className="logo react" alt="React logo" />
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <CountButton />
                <p>
                    Edit <code>demo/DemoApp.jsx</code> and save to test HMR
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
        </div>
    );
}

export default App;
