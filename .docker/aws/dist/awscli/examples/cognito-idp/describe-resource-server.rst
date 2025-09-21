**To describe a resource server**

This example describes the resource server weather.example.com. 

Command::

  aws cognito-idp describe-resource-server --user-pool-id us-west-2_aaaaaaaaa --identifier weather.example.com

Output::

  {
    "ResourceServer": {
        "UserPoolId": "us-west-2_aaaaaaaaa",
        "Identifier": "weather.example.com",
        "Name": "Weather",
        "Scopes": [
            {
                "ScopeName": "weather.update",
                "ScopeDescription": "Update weather forecast"
            },
            {
                "ScopeName": "weather.read",
                "ScopeDescription": "Read weather forecasts"
            },
            {
                "ScopeName": "weather.delete",
                "ScopeDescription": "Delete a weather forecast"
            }
        ]
    }
  }
  
