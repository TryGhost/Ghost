**To update a game session queue configuration**

The following ``update-game-session-queue`` example adds a new destination and updates the player latency policies for an existing game session queue. ::

    aws gamelift update-game-session-queue \
        --name MegaFrogRace-NA \
        --destinations file://destinations.json \
        --player-latency-policies file://latency-policies.json

Contents of ``destinations.json``::

    {
        "Destinations": [ 
            {"DestinationArn": "arn:aws:gamelift:us-west-2::fleet/fleet-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"},
            {"DestinationArn": "arn:aws:gamelift:us-east-1::fleet/fleet-5c6d3c4d-5e6f-7a8b-9c0d-1e2f3a4b5a2b"},
            {"DestinationArn": "arn:aws:gamelift:us-east-1::alias/alias-11aa22bb-3c4d-5e6f-000a-1111aaaa22bb"}
        ]
    }

Contents of ``latency-policies.json``::

    {
        "PlayerLatencyPolicies": [ 
            {"MaximumIndividualPlayerLatencyMilliseconds": 200},
            {"MaximumIndividualPlayerLatencyMilliseconds": 150, "PolicyDurationSeconds": 120},
            {"MaximumIndividualPlayerLatencyMilliseconds": 100, "PolicyDurationSeconds": 120}
        ]
    }

Output::

    {
        "GameSessionQueue": {
            "Destinations": [
                {"DestinationArn": "arn:aws:gamelift:us-west-2::fleet/fleet-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"},
                {"DestinationArn": "arn:aws:gamelift:us-east-1::fleet/fleet-5c6d3c4d-5e6f-7a8b-9c0d-1e2f3a4b5a2b"}, 
                {"DestinationArn": "arn:aws:gamelift:us-east-1::alias/alias-11aa22bb-3c4d-5e6f-000a-1111aaaa22bb"}
            ],
            "GameSessionQueueArn": "arn:aws:gamelift:us-west-2:111122223333:gamesessionqueue/MegaFrogRace-NA",
            "Name": "MegaFrogRace-NA",
            "TimeoutInSeconds": 600,
            "PlayerLatencyPolicies": [
                {"MaximumIndividualPlayerLatencyMilliseconds": 200}, 
                {"MaximumIndividualPlayerLatencyMilliseconds": 150, "PolicyDurationSeconds": 120},
                {"MaximumIndividualPlayerLatencyMilliseconds": 100, "PolicyDurationSeconds": 120}
            ]
        }
    }

For more information, see `Using Multi-Region Queues <https://docs.aws.amazon.com/gamelift/latest/developerguide/queues-intro.html>`__ in the *Amazon GameLift Developer Guide*.
