**To view game session queues**

The following ``describe-game-session-queues`` example retrieves properties for two specified queues. ::

    aws gamelift describe-game-session-queues \
        --names MegaFrogRace-NA MegaFrogRace-EU

Output::

    {
        "GameSessionQueues": [{
                "Destinations": [{
                        "DestinationArn": "arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
                    },
                    {
                        "DestinationArn": "arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
                    }
                ],
                "Name": "MegaFrogRace-NA",
                "TimeoutInSeconds": 600,
                "GameSessionQueueArn": "arn:aws:gamelift:us-west-2::gamesessionqueue/MegaFrogRace-NA",
                "PlayerLatencyPolicies": [{
                        "MaximumIndividualPlayerLatencyMilliseconds": 200
                    },
                    {
                        "MaximumIndividualPlayerLatencyMilliseconds": 100,
                        "PolicyDurationSeconds": 60
                    }
                ],
                "FilterConfiguration": {
                    "AllowedLocations": ["us-west-2", "ap-south-1", "us-east-1"]
                },
                "PriorityConfiguration": {
                    "PriorityOrder": ["LOCATION", "FLEET_TYPE", "DESTINATION"],
                    "LocationOrder": ["us-west-2", "ap-south-1", "us-east-1"]
                }
            },
            {
                "Destinations": [{
                    "DestinationArn": "arn:aws:gamelift:eu-west-3::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"
                }],
                "Name": "MegaFrogRace-EU",
                "TimeoutInSeconds": 600,
                "GameSessionQueueArn": "arn:aws:gamelift:us-west-2::gamesessionqueue/MegaFrogRace-EU"
            }
        ]
    }

For more information, see `Using Multi-Region Queues <https://docs.aws.amazon.com/gamelift/latest/developerguide/queues-intro.html>`__ in the *Amazon GameLift Developer Guide*.