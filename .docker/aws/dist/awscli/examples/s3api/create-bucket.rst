**Example 1: To create a bucket**

The following ``create-bucket`` example creates a bucket named ``amzn-s3-demo-bucket``::

    aws s3api create-bucket \
        --bucket amzn-s3-demo-bucket \
        --region us-east-1

Output::

    {
        "Location": "/amzn-s3-demo-bucket"
    }

For more information, see `Creating a bucket <https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html>`__ in the *Amazon S3 User Guide*.

**Example 2: To create a bucket with owner enforced**

The following ``create-bucket`` example creates a bucket named ``amzn-s3-demo-bucket`` that uses the bucket owner enforced setting for S3 Object Ownership. ::

    aws s3api create-bucket \
        --bucket amzn-s3-demo-bucket \
        --region us-east-1 \
        --object-ownership BucketOwnerEnforced

Output::

    {
        "Location": "/amzn-s3-demo-bucket"
    }

For more information, see `Controlling ownership of objects and disabling ACLs <https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html>`__ in the *Amazon S3 User Guide*.

**Example 3: To create a bucket outside of the ``us-east-1`` region**

The following ``create-bucket`` example creates a bucket named ``amzn-s3-demo-bucket`` in the
``eu-west-1`` region. Regions outside of ``us-east-1`` require the appropriate
``LocationConstraint`` to be specified in order to create the bucket in the
desired region. ::

    aws s3api create-bucket \
        --bucket amzn-s3-demo-bucket \
        --region eu-west-1 \
        --create-bucket-configuration LocationConstraint=eu-west-1 

Output::

    {
        "Location": "http://amzn-s3-demo-bucket.s3.amazonaws.com/"
    }

For more information, see `Creating a bucket <https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html>`__ in the *Amazon S3 User Guide*.