**To create a playback restriction policy**

The following ``create-playback-restriction-policy`` example creates a new playback resriction policy. ::

    aws ivs create-playback-restriction-policy \
        --name "test-playback-restriction-policy" \
        --enable-strict-origin-enforcement \
        --tags "key1=value1, key2=value2" \
        --allowed-countries US MX \
        --allowed-origins https://www.website1.com https://www.website2.com

Output::

    {
        "playbackRestrictionPolicy": {
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
    }

For more information, see `Undesired Content and Viewers <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/undesired-content.html>`__ in the *IVS Low-Latency User Guide*.

