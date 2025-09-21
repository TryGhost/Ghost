**To purchase a reserved DB instance offering**

The following ``purchase-reserved-db-instances-offering`` example purchases a reserved DB instance offering.  The ``reserved-db-instances-offering-id`` must be a valid offering ID, as returned by the ``describe-reserved-db-instances-offering`` command.

    aws rds purchase-reserved-db-instances-offering \
        --reserved-db-instances-offering-id 438012d3-4a52-4cc7-b2e3-8dff72e0e706 

