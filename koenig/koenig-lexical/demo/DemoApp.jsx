import {KoenigComposer, KoenigEditor} from '../src';

function DemoApp() {
    return (
        <div className="demo-container">
            <div className="demo-editor">
                <KoenigComposer>
                    <KoenigEditor>
                    </KoenigEditor>
                </KoenigComposer>
            </div>
        </div>
    );
}

export default DemoApp;
