import {KoenigComposer, KoenigEditor} from '../src';
import SerializedStateTextarea from './components/SerializedStateTextarea';

function DemoApp() {
    return (
        <div className="koenig-lexical">
            <KoenigComposer>
                <div className="mx-auto mt-[20vmin] max-w-3xl">
                    <KoenigEditor>
                    </KoenigEditor>
                </div>
                <SerializedStateTextarea />
            </KoenigComposer>
        </div>
    );
}

export default DemoApp;
