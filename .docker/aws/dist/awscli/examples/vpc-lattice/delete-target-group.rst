**To delete a target group**

The following ``delete-target-group`` example deletes the specified target group. ::

    aws vpc-lattice delete-target-group \
        --target-group-identifier tg-0eaa4b9ab4EXAMPLE

Output::

    {
        "arn": "arn:aws:vpc-lattice:us-east-2:123456789012:targetgroup/tg-0eaa4b9ab4EXAMPLE",
        "id": "tg-0eaa4b9ab4EXAMPLE",
        "status": "DELETE_IN_PROGRESS"
    }

For more information, see `Target groups <https://docs.aws.amazon.com/vpc-lattice/latest/ug/target-groups.html>`__ in the *Amazon VPC Lattice User Guide*.