**To get information about deployment instances**

The following ``list-deployment-instances`` example displays information about all deployment instances that are associated with the specified deployment. ::

    aws deploy list-deployment-instances \
        --deployment-id d-A1B2C3111 \
        --instance-status-filter Succeeded

Output::

    {
        "instancesList": [
            "i-EXAMPLE11",
            "i-EXAMPLE22"
        ]
    }
