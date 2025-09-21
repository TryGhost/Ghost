**To delete a DB security group**

The following ``delete-db-security-group`` example deletes a DB security group named ``mysecuritygroup``. ::

    aws rds delete-db-security-group \
        --db-security-group-name mysecuritygroup

This command produces no output.

For more information, see `Working with DB security groups (EC2-Classic platform) <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithSecurityGroups.html>`__ in the *Amazon RDS User Guide*.
