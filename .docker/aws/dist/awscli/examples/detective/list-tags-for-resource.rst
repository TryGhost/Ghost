**To retrieve the tags assigned to a behavior graph**

The following ``list-tags-for-resource`` example returns the tags assigned to the specified behavior graph. ::

    aws detective list-tags-for-resource \
        --resource-arn arn:aws:detective:us-east-1:111122223333:graph:123412341234

Output::

    {
        "Tags": {
            "Department" : "Finance"
        }
    }

For more information, see `Managing tags for a behavior graph <https://docs.aws.amazon.com/detective/latest/adminguide/graph-tags.html>`__ in the *Amazon Detective Administration Guide*.