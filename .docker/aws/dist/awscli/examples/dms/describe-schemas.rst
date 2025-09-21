**To desscribe database schemas**

The following ``describe-schemas`` example lists the available tables at an endpoint. ::

    aws dms describe-schemas \
        --endpoint-arn "arn:aws:dms:us-east-1:123456789012:endpoint:6GGI6YPWWGAYUVLKIB732KEVWA"

Output::

    {
        "Schemas": [
            "prodrep"
        ]
    }


For more information, see `This is the topic title <https://link.to.the/topic/page>`__ in the *AWS Database Migration Service User Guide*.
