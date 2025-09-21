**Configure an S3 bucket as a static website**

The following command configures a bucket named ``amzn-s3-demo-bucket`` as a static website. The index document option specifies the file in ``amzn-s3-demo-bucket`` that visitors will be directed to when they navigate to the website URL. In this case, the bucket is in the us-west-2 region, so the site would appear at ``http://amzn-s3-demo-bucket.s3-website-us-west-2.amazonaws.com``. 

All files in the bucket that appear on the static site must be configured to allow visitors to open them. File permissions are configured separately from the bucket website configuration. ::

    aws s3 website s3://amzn-s3-demo-bucket/ \
        --index-document index.html \
        --error-document error.html

For information on hosting a static website in Amazon S3, see `Hosting a Static Website <https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html>`__ in the *Amazon Simple Storage Service Developer Guide*.