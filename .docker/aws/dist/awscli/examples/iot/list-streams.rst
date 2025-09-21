**To list the streams in the account**

The following ``list-streams`` example lists all of the streams in your AWS account. ::

    aws iot list-streams

Output::

   {
       "streams": [
           {
               "streamId": "stream12345",
               "streamArn": "arn:aws:iot:us-west-2:123456789012:stream/stream12345",
               "streamVersion": 1,
               "description": "This stream is used for Amazon FreeRTOS OTA Update 12345."
           },
           {
               "streamId": "stream54321",
               "streamArn": "arn:aws:iot:us-west-2:123456789012:stream/stream54321",
               "streamVersion": 1,
               "description": "This stream is used for Amazon FreeRTOS OTA Update 54321."
           }
       ]
   }

For more information, see `ListStreams <https://docs.aws.amazon.com/iot/latest/apireference/API_ListStreams.html>`__ in the *AWS IoT API Reference*.
