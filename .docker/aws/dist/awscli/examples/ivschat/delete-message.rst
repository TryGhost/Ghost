**To delete messages from a specified room**

The following ``delete-message`` example sends an even to the specified room, which directs clients to delete the specified message: that is, unrender it from view and delete it from the client's chat history. ::

    aws ivschat delete-message \
        --roomIdentifier "arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6" \
        --id "ABC123def456" \
        --reason "Message contains profanity"

Output::

    {
        "id": "12345689012"
    }

For more information, see `Getting Started with Amazon IVS Chat <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.