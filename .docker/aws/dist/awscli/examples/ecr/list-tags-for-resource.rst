**To list the tags for repository**

The following ``list-tags-for-resource`` example displays a list of the tags associated with the ``hello-world`` repository. ::

    aws ecr list-tags-for-resource \
        --resource-arn arn:aws:ecr:us-west-2:012345678910:repository/hello-world
  
Output::

    {
        "tags": [
            {
                "Key": "Stage",
                "Value": "Integ"
            }
        ]
    }
  
