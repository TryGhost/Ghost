**To get summary information about all playback restriction policies**

The following ``list-playback-restriction-policies`` example lists all playback restriction policies for your AWS account. ::

    aws ivs list-playback-restriction-policies

Output::

    {
        "playbackRestrictionPolicies": [
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:playback-restriction-policy/ABcdef34ghIJ",
                "allowedCountries": [
                    "US",
                    "MX"
                ],
                "allowedOrigins": [
                    "https://www.website1.com",
                    "https://www.website2.com"
                ],
                "enableStrictOriginEnforcement": true,
                "name": "test-playback-restriction-policy",
                "tags": {
                    "key1": "value1",
                    "key2": "value2"
                }
            }
        ]
    }

For more information, see `Undesired Content and Viewers <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/undesired-content.html>`__ in the *IVS Low-Latency User Guide*.