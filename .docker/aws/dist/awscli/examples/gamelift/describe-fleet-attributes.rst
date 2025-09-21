**Example1: To view attributes for a list of fleets**

The following ``describe-fleet-attributes`` example retrieves fleet attributes for two specified fleets. As shown, the requested fleets are deployed with the same build, one for On-Demand instances and one for Spot instances, with some minor configuration differences. ::

    aws gamelift describe-fleet-attributes \
        --fleet-ids arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222

Output::

    {
        "FleetAttributes": [
            {
                "FleetId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "FleetArn": "arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "FleetType": "ON_DEMAND",
                "InstanceType": "c4.large",
                "Description": "On-demand hosts for v2 North America",
                "Name": "MegaFrogRaceServer.NA.v2-od",
                "CreationTime": 1568836191.995,
                "Status": "ACTIVE",
                "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "ServerLaunchPath": "C:\\game\\MegaFrogRace_Server.exe",
                "ServerLaunchParameters": "+gamelift_start_server",
                "NewGameSessionProtectionPolicy": "NoProtection",
                "OperatingSystem": "WINDOWS_2012",
                "MetricGroups": [
                    "default"
                ],
                "CertificateConfiguration": {
                    "CertificateType": "DISABLED"
                }
            },
            {
                "FleetId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "FleetArn": "arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "FleetType": "SPOT",
                "InstanceType": "c4.large",
                "Description": "On-demand hosts for v2 North America",
                "Name": "MegaFrogRaceServer.NA.v2-spot",
                "CreationTime": 1568838275.379,
                "Status": "ACTIVATING",
                "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "ServerLaunchPath": "C:\\game\\MegaFrogRace_Server.exe",
                "NewGameSessionProtectionPolicy": "NoProtection",
                "OperatingSystem": "WINDOWS_2012",
                    "MetricGroups": [
                    "default"
                ],
                "CertificateConfiguration": {
                    "CertificateType": "GENERATED"
                }
            }
        ]
    }

**Example2: To request attributes for all fleets**

The following ``describe-fleet-attributes`` returns fleet attributes for all fleets with any status. This example illustrates the use of pagination parameters to return one fleet at a time. ::

    aws gamelift describe-fleet-attributes \
        --limit 1 

Output::

    {
        "FleetAttributes": [
            {
                "FleetId": "fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "FleetArn": "arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "FleetType": "SPOT",
                "InstanceType": "c4.large",
                "Description": "On-demand hosts for v2 North America",
                "Name": "MegaFrogRaceServer.NA.v2-spot",
                "CreationTime": 1568838275.379,
                "Status": "ACTIVATING",
                "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "ServerLaunchPath": "C:\\game\\MegaFrogRace_Server.exe",
                "NewGameSessionProtectionPolicy": "NoProtection",
                "OperatingSystem": "WINDOWS_2012",
                "MetricGroups": [
                    "default"
                ],
                "CertificateConfiguration": {
                    "CertificateType": "GENERATED"
                }
            }
        ],
        "NextToken": "eyJhd3NBY2NvdW50SWQiOnsicyI6IjMwMjc3NjAxNjM5OCJ9LCJidWlsZElkIjp7InMiOiJidWlsZC01NWYxZTZmMS1jY2FlLTQ3YTctOWI5ZS1iYjFkYTQwMjEXAMPLE2"
    }

The output includes a ``NextToken`` value that you can use when you call the command a second time. Pass the value to the ``--next-token`` parameter to specify where to pick up the output. The following command returns the second result in the output. ::
 
    aws gamelift describe-fleet-attributes \
        --limit 1 \
        --next-token eyJhd3NBY2NvdW50SWQiOnsicyI6IjMwMjc3NjAxNjM5OCJ9LCJidWlsZElkIjp7InMiOiJidWlsZC01NWYxZTZmMS1jY2FlLTQ3YTctOWI5ZS1iYjFkYTQwMjEXAMPLE1

Repeat until the response doesn't include a ``NextToken`` value.

For more information, see `Setting Up GameLift Fleets <https://docs.aws.amazon.com/gamelift/latest/developerguide/fleets-intro.html>`__ in the *Amazon GameLift Developer Guide*.
