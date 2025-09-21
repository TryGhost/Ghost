**To disconnect a user from a room**

The following ``disconnect-user`` example disconnects all connections for the specified user from the specified room. On success it returns HTTP 200 with an empty response body. ::

    aws ivschat disconnect-user \
        --roomIdentifier "arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6" \
        --userId "ABC123def456" \
        --reason "Violated terms of service"

This command produces no output.

For more information, see `Getting Started with Amazon IVS Chat <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.