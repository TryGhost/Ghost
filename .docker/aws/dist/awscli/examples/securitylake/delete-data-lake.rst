**To disable your data lake**

The following ``delete-data-lake`` example disables your data lake in the specified AWS Regions. In the specified Regions, sources no longer contribute data to the data lake. For a Security Lake deployment utilizing AWS Organizations, only the delegated Security Lake administrator for the organization can disable Security Lake for accounts in the organization. ::

    aws securitylake delete-data-lake \
        --regions "ap-northeast-1" "eu-central-1"

This command produces no output.

For more information, see `Disabling Amazon Security Lake <https://docs.aws.amazon.com/securityhub/latest/userguide/disable-security-lake.html>`__ in the *Amazon Security Lake User Guide*.
