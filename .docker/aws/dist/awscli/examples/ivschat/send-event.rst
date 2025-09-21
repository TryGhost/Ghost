**To send an event to a room**

The following ``send-event`` example sends the given event to the specified room. ::

    aws ivschat send-event \
        --roomIdentifier "arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6" \
        --eventName "SystemMessage" \
        --attributes \
            "msgType"="user-notification", \
            "msgText"="This chat room will close in 15 minutes."

Output::

    {
        "id": "12345689012"
    }

For more information, see `Getting Started with Amazon IVS Chat <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.