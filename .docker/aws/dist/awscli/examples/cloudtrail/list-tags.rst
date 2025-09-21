**To list the tags for a trail**

The following ``list-tags`` command lists the tags for ``Trail1`` and ``Trail2``::

  aws cloudtrail list-tags --resource-id-list arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail1 arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail2

Output::

  {
   "ResourceTagList": [
       {
           "ResourceId": "arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail1", 
           "TagsList": [
               {
                   "Value": "Alice", 
                   "Key": "name"
               }, 
               {
                   "Value": "us", 
                   "Key": "location"
               }
           ]
       }, 
       {
           "ResourceId": "arn:aws:cloudtrail:us-east-1:123456789012:trail/Trail2", 
           "TagsList": [
               {
                   "Value": "Bob", 
                   "Key": "name"
               }
           ]
       }
    ]
  }