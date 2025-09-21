**To create an API**

Command::

  aws apigateway create-rest-api --name 'My First API' --description 'This is my first API'

**To create a duplicate API from an existing API**

Command::

  aws apigateway create-rest-api --name 'Copy of My First API' --description 'This is a copy of my first API' --clone-from 1234123412
