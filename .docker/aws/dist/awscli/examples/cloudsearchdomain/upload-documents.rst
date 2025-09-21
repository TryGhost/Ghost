The following ``upload-documents`` command uploads a batch of JSON documents to an Amazon CloudSearch domain::

   aws cloudsearchdomain upload-documents --endpoint-url https://doc-my-domain.us-west-1.cloudsearch.amazonaws.com --content-type application/json --documents document-batch.json

Output::

   {
     "status": "success",
     "adds": 5000,
     "deletes": 0
   }
