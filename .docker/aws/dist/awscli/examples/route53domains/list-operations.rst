**To list the status of operations that return an operation ID**

Some domain registration operations run asynchronously and return a response before they finish. These operations return an operation ID that you can use to get the current status. The following ``list-operations`` command lists summary information, including the status, about the current domain-registration operations. 

This command runs only in the ``us-east-1`` Region. If your default region is set to ``us-east-1``, you can omit the ``region`` parameter. ::

    aws route53domains list-operations
        --region us-east-1

Output::

    {
        "Operations": [
            {
                "OperationId": "aab9822f-1da0-4bf3-8a15-fd4e0example",
                "Status": "SUCCESSFUL",
                "Type": "DOMAIN_LOCK",
                "SubmittedDate": 1455321739.986
            },
            {
                "OperationId": "c24379ed-76be-42f8-bdad-9379bexample",
                "Status": "SUCCESSFUL",
                "Type": "UPDATE_NAMESERVER",
                "SubmittedDate": 1468960475.109
            },
            {
                "OperationId": "f47e1297-ef9e-4c2b-ae1e-a5fcbexample",
                "Status": "SUCCESSFUL",
                "Type": "RENEW_DOMAIN",
                "SubmittedDate": 1473561835.943
            },
            {
                "OperationId": "75584f23-b15f-459e-aed7-dc6f5example",
                "Status": "SUCCESSFUL",
                "Type": "UPDATE_DOMAIN_CONTACT",
                "SubmittedDate": 1547501003.41
            }
        ]
    }

The output includes all the operations that return an operation ID and that you have performed on all the domains that you have ever registered using the current AWS account. If you want to get only the operations that you submitted after a specified date, you can include the ``submitted-since`` parameter and specify a date in Unix format and Coordinated Universal Time (UTC). The following command gets the status of all operations that were submitted after 12:00 am UTC on January 1, 2020. ::

    aws route53domains list-operations \
        --submitted-since 1577836800
