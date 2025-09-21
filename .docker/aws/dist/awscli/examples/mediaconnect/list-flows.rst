**To view a list of flows**

The following ``list-flows`` example displays a list of flows. ::

    aws mediaconnect list-flows

Output::

   {
       "Flows": [
           {
               "Status": "STANDBY",
               "SourceType": "OWNED",
               "AvailabilityZone": "us-west-2a",
               "Description": "NYC awards show",
               "Name": "AwardsShow",
               "FlowArn": "arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow"
           },
           {
               "Status": "STANDBY",
               "SourceType": "OWNED",
               "AvailabilityZone": "us-west-2c",
               "Description": "LA basketball game",
               "Name": "BasketballGame",
               "FlowArn": "arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BasketballGame"
           }
       ]
   }

For more information, see `Viewing a List of Flows <https://docs.aws.amazon.com/mediaconnect/latest/ug/flows-view-list.html>`__ in the *AWS Elemental MediaConnect User Guide*.
