**To view inbound connection permissions for a fleet**

The following ``describe-fleet-port-settings`` example retrieves connection settings for a specified fleet. ::

    aws gamelift describe-fleet-port-settings \
        --fleet-id arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "InboundPermissions": [
            {
                "FromPort": 33400,
                "ToPort": 33500,
                "IpRange": "0.0.0.0/0",
                "Protocol": "UDP"
            },
            {
                "FromPort": 1900,
                "ToPort": 2000,
                "IpRange": "0.0.0.0/0",
                "Protocol": "TCP"
            }
        ]
    }

For more information, see `Setting Up GameLift Fleets <https://docs.aws.amazon.com/gamelift/latest/developerguide/fleets-intro.html>`__ in the *Amazon GameLift Developer Guide*.
