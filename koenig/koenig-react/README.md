# Koenig React

## Develop
  
This is a mono repository, managed with [lerna](https://lernajs.io/).

Follow the instructions for the top-level repo.

1.  `git clone` this repo & `cd` into it as usual

2. Run `yarn` to install top-level dependencies.

  
## Usage

  In the package directory, you can run:

  ### `yarn start`

Runs the app in the development mode.

Open [http://localhost:1337](http://localhost:1337) to view it in your browser.

The page will reload when you make changes.


### `yarn serve`

Serves the minified UMD component `koenig-react.min.js` as [http://localhost:1338/koenig-react-min.js](http://localhost:1338/koenig-react-min.js). It automatically reloads and rebuilds when it detects changes.
It's also CORS friendly 😊 for usage in other applications.
  

### `yarn build`

Builds a production ready version of `koenig-react.min.js` and saves it into `./dist/umd`.

 
## Install

`npm install @tryghost/koenig-react --save`
or  
`yarn add @tryghost/koenig-react`
  

## Test

-  `yarn lint` run just eslint

-  `yarn test` run lint and tests
 

# Copyright & License

Copyright (c) 2013-2022 Ghost Foundation - Released under the [MIT license](LICENSE).