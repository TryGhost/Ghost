**To create a user pool client**

The following ``create-resource-server`` example creates a new resource server with custom scopes. ::

    aws cognito-idp create-resource-server \
        --user-pool-id us-west-2_EXAMPLE \
        --identifier solar-system-data \
        --name "Solar system object tracker" \
        --scopes ScopeName=sunproximity.read,ScopeDescription="Distance in AU from Sol" ScopeName=asteroids.add,ScopeDescription="Enter a new asteroid"

Output::

    {
        "ResourceServer": {
            "UserPoolId": "us-west-2_EXAMPLE",
            "Identifier": "solar-system-data",
            "Name": "Solar system object tracker",
            "Scopes": [
                {
                    "ScopeName": "sunproximity.read",
                    "ScopeDescription": "Distance in AU from Sol"
                },
                {
                    "ScopeName": "asteroids.add",
                    "ScopeDescription": "Enter a new asteroid"
                }
            ]
        }
    }

For more information, see `Scopes, M2M, and APIs with resource servers <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html>`__ in the *Amazon Cognito Developer Guide*.
