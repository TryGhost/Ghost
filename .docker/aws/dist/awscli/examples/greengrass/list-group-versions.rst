**To list the versions of a Greengrass group**

The following ``list-group-versions`` example lists the versions of the specified Greengrass group. ::

    aws greengrass list-group-versions \
        --group-id "1013db12-8b58-45ff-acc7-704248f66731"

Output::

   {
       "Versions": [
           {
               "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/versions/115136b3-cfd7-4462-b77f-8741a4b00e5e",
               "CreationTimestamp": "2019-06-18T17:04:30.915Z",
               "Id": "1013db12-8b58-45ff-acc7-704248f66731",
               "Version": "115136b3-cfd7-4462-b77f-8741a4b00e5e"
           },
           {
               "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/versions/4340669d-d14d-44e3-920c-46c928750750",
               "CreationTimestamp": "2019-06-18T17:03:52.663Z",
               "Id": "1013db12-8b58-45ff-acc7-704248f66731",
               "Version": "4340669d-d14d-44e3-920c-46c928750750"
           },
           {
               "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/versions/1b06e099-2d5b-4f10-91b9-78c4e060f5da",
               "CreationTimestamp": "2019-06-18T17:02:44.189Z",
               "Id": "1013db12-8b58-45ff-acc7-704248f66731",
               "Version": "1b06e099-2d5b-4f10-91b9-78c4e060f5da"
           },
           {
               "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/versions/2d3f27f1-3b43-4554-ab7a-73ec30477efe",
               "CreationTimestamp": "2019-06-18T17:01:42.401Z",
               "Id": "1013db12-8b58-45ff-acc7-704248f66731",
               "Version": "2d3f27f1-3b43-4554-ab7a-73ec30477efe"
           },
           {
               "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/versions/d20f7ae9-3444-4c1c-b025-e2ede23cdd31",
               "CreationTimestamp": "2019-06-18T16:21:21.457Z",
               "Id": "1013db12-8b58-45ff-acc7-704248f66731",
               "Version": "d20f7ae9-3444-4c1c-b025-e2ede23cdd31"
           }
       ]
   }