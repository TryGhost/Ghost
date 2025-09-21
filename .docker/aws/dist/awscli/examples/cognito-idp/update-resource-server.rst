**To update a resource server**

This example updates the the resource server Weather. It adds a new scope.

Command::

  aws cognito-idp update-resource-server --user-pool-id us-west-2_aaaaaaaaa --identifier weather.example.com --name Weather --scopes ScopeName=NewScope,ScopeDescription="New scope description"

Output::

  {
    "ResourceServer": {
        "UserPoolId": "us-west-2_aaaaaaaaa",
        "Identifier": "weather.example.com",
        "Name": "Happy",
        "Scopes": [
            {
                "ScopeName": "NewScope",
                "ScopeDescription": "New scope description"
            }
        ]
    }
  }