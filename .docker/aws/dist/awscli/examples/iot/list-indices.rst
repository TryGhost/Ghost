**To list the configured search indices**

The following ``list-indices`` example lists all configured search indices in your AWS account. If you have not enabled thing indexing, you might not have any indices. ::

    aws iot list-indices

Output::

   {
       "indexNames": [
           "AWS_Things"
       ]
   }

For more information, see `Managing Thing Indexing <https://docs.aws.amazon.com/iot/latest/developerguide/managing-index.html>`__ in the *AWS IoT Developer Guide*.
