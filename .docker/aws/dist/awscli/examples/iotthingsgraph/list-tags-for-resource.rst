**To list all tags for a resource**

The following ``list-tags-for-resource`` example list all tags for an AWS IoT Things Graph resource. ::

    aws iotthingsgraph list-tags-for-resource \
        --resource-arn "arn:aws:iotthingsgraph:us-west-2:123456789012:Deployment/default/Room218"

Output::

    {
       "tags": [ 
          { 
             "key": "Type",
             "value": "Residential"
          }
       ]
    }

For more information, see `Tagging Your AWS IoT Things Graph Resources <https://docs.aws.amazon.com/thingsgraph/latest/ug/tagging-tg.html>`__ in the *AWS IoT Things Graph User Guide*.
