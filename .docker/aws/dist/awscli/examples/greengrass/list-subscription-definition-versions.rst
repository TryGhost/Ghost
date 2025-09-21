**To list the versions of a subscription definition**

The following ``list-subscription-definition-versions`` example lists all versions of the specified subscription. You can use the ``list-subscription-definitions`` command to look up the subscription ID. ::

    aws greengrass list-subscription-definition-versions \
        --subscription-definition-id "70e49321-83d5-45d2-bc09-81f4917ae152"

Output::

   {
       "Versions": [
           {
               "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/70e49321-83d5-45d2-bc09-81f4917ae152/versions/88ae8699-12ac-4663-ba3f-4d7f0519140b",
               "CreationTimestamp": "2019-06-18T17:03:52.499Z",
               "Id": "70e49321-83d5-45d2-bc09-81f4917ae152",
               "Version": "88ae8699-12ac-4663-ba3f-4d7f0519140b"
           },
           {
               "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/70e49321-83d5-45d2-bc09-81f4917ae152/versions/7e320ba3-c369-4069-a2f0-90acb7f219d6",
               "CreationTimestamp": "2019-06-18T17:03:52.392Z",
               "Id": "70e49321-83d5-45d2-bc09-81f4917ae152",
               "Version": "7e320ba3-c369-4069-a2f0-90acb7f219d6"
           }
       ]
   }
