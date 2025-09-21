**To send a custom event to CloudWatch Events**

This example sends a custom event to CloudWatch Events. The event is contained within the putevents.json file::

  aws events put-events --entries file://putevents.json            

Here are the contents of the putevents.json file::

  [
    {
      "Source": "com.mycompany.myapp",
      "Detail": "{ \"key1\": \"value1\", \"key2\": \"value2\" }",
      "Resources": [
        "resource1",
        "resource2"
      ],
      "DetailType": "myDetailType"
    },
    {
      "Source": "com.mycompany.myapp",
      "Detail": "{ \"key1\": \"value3\", \"key2\": \"value4\" }",
      "Resources": [
        "resource1",
        "resource2"
      ],
      "DetailType": "myDetailType"
     }
  ]
