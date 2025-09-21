**To view capacity status for a list of fleets**

The following ``describe-fleet-capacity`` example retrieves current capacity for two specified fleets. ::

    aws gamelift describe-fleet-capacity \
        --fleet-ids arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222

Output::

    {
        "FleetCapacity": [
            {
                "FleetId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "InstanceType": "c5.large",
                "InstanceCounts": {
                    "DESIRED": 10,
                    "MINIMUM": 1,
                    "MAXIMUM": 20,
                    "PENDING": 0,
                    "ACTIVE": 10,
                    "IDLE": 3,
                    "TERMINATING": 0
                }
            },
            {
                "FleetId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "InstanceType": "c5.large",
                "InstanceCounts": {
                    "DESIRED": 13,
                    "MINIMUM": 1,
                    "MAXIMUM": 20,
                    "PENDING": 0,
                    "ACTIVE": 15,
                    "IDLE": 2,
                    "TERMINATING": 2
                }
            }

        ]
    }

For more information, see `GameLift Metrics for Fleets <https://docs.aws.amazon.com/gamelift/latest/developerguide/monitoring-cloudwatch.html#gamelift-metrics-fleet>`__ in the *Amazon GameLift Developer Guide*.
