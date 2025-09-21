**Example1: To set up an ordered game session queue**

The following ``create-game-session-queue`` example creates a new game session queue with destinations in two regions. It also configures the queue so that game session requests time out after waiting 10 minutes for placement. Since no latency policies are defined, GameLift attempts to place all game sessions with the first destination listed. ::

    aws gamelift create-game-session-queue \
        --name MegaFrogRaceServer-NA \
        --destinations file://destinations.json \
        --timeout-in-seconds 600

Contents of ``destinations.json``::

    {
        "Destinations": [ 
            {"DestinationArn": "arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111" },
            {"DestinationArn": "arn:aws:gamelift:us-west-1::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222" }
        ]
    }

Output::

    {
        "GameSessionQueues": [
	    {
                "Name": "MegaFrogRaceServer-NA",
                "GameSessionQueueArn": "arn:aws:gamelift:us-west-2:123456789012:gamesessionqueue/MegaFrogRaceServer-NA",
                "TimeoutInSeconds": 600,
                "Destinations": [
                    {"DestinationArn": "arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"},
                    {"DestinationArn": "arn:aws:gamelift:us-west-1::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"}
                ]
            }
        ]
    }

**Example2: To set up a game session queue with player latency policies**

The following ``create-game-session-queue`` example creates a new game session queue with two player latency policies. The first policy sets a 100ms latency cap that is enforced during the first minute of a game session placement attempt. The second policy raises the latency cap to 200ms until the placement request times out at 3 minutes. ::

    aws gamelift create-game-session-queue \
        --name MegaFrogRaceServer-NA \
        --destinations file://destinations.json \
        --player-latency-policies file://latency-policies.json \
        --timeout-in-seconds 180

Contents of ``destinations.json``::

    {
        "Destinations": [ 
            { "DestinationArn": "arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111" },
            { "DestinationArn": "arn:aws:gamelift:us-east-1::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222" }
        ]
    }

Contents of ``latency-policies.json``::

    {
        "PlayerLatencyPolicies": [ 
            {"MaximumIndividualPlayerLatencyMilliseconds": 200},
            {"MaximumIndividualPlayerLatencyMilliseconds": 100, "PolicyDurationSeconds": 60}
        ]
    }

Output::

    {
        "GameSessionQueue": {
            "Name": "MegaFrogRaceServer-NA",
            "GameSessionQueueArn": "arn:aws:gamelift:us-west-2:111122223333:gamesessionqueue/MegaFrogRaceServer-NA",
            "TimeoutInSeconds": 600,
            "PlayerLatencyPolicies": [
                {
                    "MaximumIndividualPlayerLatencyMilliseconds": 100, 
                    "PolicyDurationSeconds": 60
                }, 
                {
                    "MaximumIndividualPlayerLatencyMilliseconds": 200
                }
            ]
            "Destinations": [
                {"DestinationArn": "arn:aws:gamelift:us-west-2::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"},
                {"DestinationArn": "arn:aws:gamelift:us-east-1::fleet/fleet-a1b2c3d4-5678-90ab-cdef-EXAMPLE22222"}
            ],
        }
    }

For more information, see `Create a Queue <https://docs.aws.amazon.com/gamelift/latest/developerguide/queues-creating.html#queues-creating-cli>`__ in the *Amazon GameLift Developer Guide*.