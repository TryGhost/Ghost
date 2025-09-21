**Example1: To view usage data for a list of fleets**

The following ``describe-fleet-utilization`` example retrieves current usage information for one specified fleet. ::

    aws gamelift describe-fleet-utilization \
        --fleet-ids arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "FleetUtilization": [
            {
            "FleetId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "ActiveServerProcessCount": 100,
            "ActiveGameSessionCount": 62,
            "CurrentPlayerSessionCount": 329,
            "MaximumPlayerSessionCount": 1000
            }
        ]
    }

**Example2: To request usage data for all fleets**

The following ``describe-fleet-utilization`` returns fleet usage data for all fleets with any status. This example uses pagination parameters to return data for two fleets at a time. ::

    aws gamelift describe-fleet-utilization \
        --limit 2 

Output::

    {
        "FleetUtilization": [
            {
                "FleetId": "fleet-1111aaaa-22bb-33cc-44dd-5555eeee66ff",
                "ActiveServerProcessCount": 100,
                "ActiveGameSessionCount": 13,
                "CurrentPlayerSessionCount": 98,
                "MaximumPlayerSessionCount": 1000
            },
            {
                "FleetId": "fleet-2222bbbb-33cc-44dd-55ee-6666ffff77aa",
                "ActiveServerProcessCount": 100,
                "ActiveGameSessionCount": 62,
                "CurrentPlayerSessionCount": 329,
                "MaximumPlayerSessionCount": 1000
            }
        ],
        "NextToken": "eyJhd3NBY2NvdW50SWQiOnsicyI6IjMwMjc3NjAxNjM5OCJ9LCJidWlsZElkIjp7InMiOiJidWlsZC01NWYxZTZmMS1jY2FlLTQ3YTctOWI5ZS1iYjFkYTQwMjEXAMPLE2"
    }

Call the command a second time, passing the ``NextToken`` value as the argument to the ``--next-token`` parameter to see the next two results. ::

    aws gamelift describe-fleet-utilization \
        --limit 2 \
        --next-token eyJhd3NBY2NvdW50SWQiOnsicyI6IjMwMjc3NjAxNjM5OCJ9LCJidWlsZElkIjp7InMiOiJidWlsZC01NWYxZTZmMS1jY2FlLTQ3YTctOWI5ZS1iYjFkYTQwMjEXAMPLE2

Repeat until the response no longer includes a ``NextToken`` value in the output.

For more information, see `GameLift Metrics for Fleets <https://docs.aws.amazon.com/gamelift/latest/developerguide/monitoring-cloudwatch.html#gamelift-metrics-fleet>`__ in the *Amazon GameLift Developer Guide*.


