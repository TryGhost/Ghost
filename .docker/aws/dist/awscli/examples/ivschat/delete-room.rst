**To delete a room**

The following ``delete-room`` example deletes the specified room. Connected clients are disconnected. On success it returns HTTP 204 with an empty response body. ::

    aws ivschat delete-room \
        --identifier "arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6"

This command produces no output.

For more information, see `Getting Started with Amazon IVS Chat <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.