**To create a stage participant token**

The following ``create-participant-token`` example creates a participant toke for the specified stage. ::

    aws ivs-realtime create-participant-token \
        --stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --user-id bob

Output::

    {
        "participantToken": {
            "expirationTime": "2023-03-07T09:47:43+00:00",
            "participantId": "ABCDEfghij01234KLMN6789",
            "token": "abcd1234defg5678"
        }
    }

For more information, see `Enabling Multiple Hosts on an Amazon IVS Stream <https://docs.aws.amazon.com/ivs/latest/userguide/multiple-hosts.html>`__ in the *Amazon Interactive Video Service User Guide*.