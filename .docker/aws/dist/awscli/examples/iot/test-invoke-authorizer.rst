**To test your custom authorizer**

The following ``test-invoke-authorizer`` example testS your custom authorizer. ::

    aws iot test-invoke-authorizer \
        --authorizer-name IoTAuthorizer \
        --token allow \
        --token-signature "mE0GvaHqy9nER/FdgtJX5lXYEJ3b3vE7t1gEszc0TKGgLKWXTnPkb2AbKnOAZ8lGyoN5dVtWDWVmr25m7++zjbYIMk2TBvyGXhOmvKFBPkdgyA43KL6SiZy0cTqlPMcQDsP7VX2rXr7CTowCxSNKphGXdQe0/I5dQ+JO6KUaHwCmupt0/MejKtaNwiia064j6wprOAUwG5S1IYFuRd0X+wfo8pb0DubAIX1Ua705kuhRUcTx4SxUShEYKmN4IDEvLB6FsIr0B2wvB7y4iPmcajxzGl02ExvyCUNctCV9dYlRRGJj0nsGzBIXOI4sGytPfqlA7obdgmN22pkDzYvwjQ=="

Output::

    {
        "isAuthenticated": true,
        "principalId": "principalId",
        "policyDocuments": [
            "{"Version":"2012-10-17","Statement":[{"Action":"iot:Publish","Effect":"Allow","Resource":"arn:aws:iot:us-west-2:123456789012:topic/customauthtesting"}]}"
        ],
        "refreshAfterInSeconds": 600,
        "disconnectAfterInSeconds": 3600
    }

For more information, see `TestInvokeAuthorizer <https://docs.aws.amazon.com/iot/latest/apireference/API_TestInvokeAuthorizers.html>`__ in the *AWS IoT API Reference*.
