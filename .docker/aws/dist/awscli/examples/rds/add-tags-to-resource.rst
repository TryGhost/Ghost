**To add tags to a resource**

The following ``add-tags-to-resource`` example add tags to an RDS database. :: 

    aws rds add-tags-to-resource \
        --resource-name arn:aws:rds:us-east-1:123456789012:db:database-mysql \
        --tags "[{\"Key\": \"Name\",\"Value\": \"MyDatabase\"},{\"Key\": \"Environment\",\"Value\": \"test\"}]"

This command produces no output.

For more information, see `Tagging Amazon RDS Resources <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Tagging.html>`__ in the *Amazon RDS User Guide*.
