**To view a list of containers**

The following ``list-containers`` example displays a list of all containers that are associated with your account. ::

    aws mediastore list-containers

Output::

    {
        "Containers": [
            {
                "CreationTime": 1505317931,
                "Endpoint": "https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com",
                "Status": "ACTIVE",
                "ARN": "arn:aws:mediastore:us-west-2:111122223333:container/ExampleLiveDemo",
                "AccessLoggingEnabled": false,
                "Name": "ExampleLiveDemo"
            },
            {
                "CreationTime": 1506528818,
                "Endpoint": "https://fffggghhhiiijj.data.mediastore.us-west-2.amazonaws.com",
                "Status": "ACTIVE",
                "ARN": "arn:aws:mediastore:us-west-2:111122223333:container/ExampleContainer",
                "AccessLoggingEnabled": false,
                "Name": "ExampleContainer"
            }
        ]
    }

For more information, see `Viewing a List of Containers <https://docs.aws.amazon.com/mediastore/latest/ug/containers-view-list.html>`__ in the *AWS Elemental MediaStore User Guide*.
