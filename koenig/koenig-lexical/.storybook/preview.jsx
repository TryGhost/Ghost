import '../src/styles/index.css';
import {LexicalComposer} from '@lexical/react/LexicalComposer';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: 'light',
    values: [
      {
        name: 'light',
        value: '#fff',
      },
      {
        name: 'dark',
        value: '#15171A',
      },
    ],
  },
  status: {
    statuses: {
      toDo: {
        background: '#AEB7C1',
        color: '#ffffff',
        description: 'This component has not yet been created',
      },
      inProgress: {
        background: '#FFB41F',
        color: '#ffffff',
        description: 'The UI for this component is in progress',
      },
      uiReady: {
        background: '#30CF43',
        color: '#ffffff',
        description: 'This component is ready to be wired up',
      },
      functional: {
        background: '#14B8FF',
        color: '#ffffff',
        description: 'This component is live and functional',
      },
      uiBlocked: {
        background: '#F50B23',
        color: '#ffffff',
        description: 'The UI for this component is blocked',
      },
    },
  },
}

export const decorators = [
    (Story) => {
        return (
            <LexicalComposer initialConfig={{namespace: 'Storybook editor'}}>
                <div className="koenig-lexical">
                    <div>
                        <Story />
                    </div>
                </div>
            </LexicalComposer>
        )
    }
];
