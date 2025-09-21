**To create a chat token**

The following ``create-chat-token`` example creates an encrypted chat token that is used to establish an individual WebSocket connection to a room. The token is valid for one minute, and a connection (session) established with the token is valid for the specified duration. ::

    aws ivschat create-chat-token \
        --roomIdentifier "arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6", \
        --userId" "11231234" \
        --capabilities "SEND_MESSAGE", \
        --sessionDurationInMinutes" 30

Output::

    {
        "token": "ACEGmnoq#1rstu2...BDFH3vxwy!4hlm!#5",
        "sessionExpirationTime": "2022-03-16T04:44:09+00:00"
        "state": "CREATING",
        "tokenExpirationTime": "2022-03-16T03:45:09+00:00"
    }

For more information, see `Step 3: Authenticate and Authorize Chat Clients <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.