**To view the details of a container**

The following ``describe-container`` example displays the details of the specified container. ::

    aws mediastore describe-container \
        --container-name ExampleContainer

Output::

    {
        "Container": {
            "CreationTime": 1563558086,
            "AccessLoggingEnabled": false,
            "ARN": "arn:aws:mediastore:us-west-2:111122223333:container/ExampleContainer",
            "Status": "ACTIVE",
            "Name": "ExampleContainer",
            "Endpoint": "https://aaabbbcccdddee.data.mediastore.us-west-2.amazonaws.com"
        }
    }

For more information, see `Viewing the Details for a Container <https://docs.aws.amazon.com/mediastore/latest/ug/containers-view-details.html>`__ in the *AWS Elemental MediaStore User Guide*.
