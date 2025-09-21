The following example enables ``PUT``, ``POST``, and ``DELETE`` requests from *www.example.com*, and enables ``GET``
requests from any domain::

   aws s3api put-bucket-cors --bucket amzn-s3-demo-bucket --cors-configuration file://cors.json

   cors.json:
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["http://www.example.com"],
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["PUT", "POST", "DELETE"],
         "MaxAgeSeconds": 3000,
         "ExposeHeaders": ["x-amz-server-side-encryption"]
       },
       {
         "AllowedOrigins": ["*"],
         "AllowedHeaders": ["Authorization"],
         "AllowedMethods": ["GET"],
         "MaxAgeSeconds": 3000
       }
     ]
   }

