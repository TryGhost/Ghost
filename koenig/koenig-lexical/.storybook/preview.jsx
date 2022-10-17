import '../src/styles/index.css';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

export const decorators = [
    (Story) => {
        return (
            <div className="koenig-lexical">
              <div className="flex">
                <Story />
              </div>
            </div>
        )
    }
];
