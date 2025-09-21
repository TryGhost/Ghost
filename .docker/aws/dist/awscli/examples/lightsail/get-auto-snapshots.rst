**To get the available automatic snapshots for an instance**

The following ``get-auto-snapshots`` example returns the available automatic snapshots for instance ``WordPress-1``. ::

    aws lightsail get-auto-snapshots \
        --resource-name WordPress-1

Output::

    {
        "resourceName": "WordPress-1",
        "resourceType": "Instance",
        "autoSnapshots": [
            {
                "date": "2019-10-14",
                "createdAt": 1571033872.0,
                "status": "Success",
                "fromAttachedDisks": []
            },
            {
                "date": "2019-10-13",
                "createdAt": 1570947473.0,
                "status": "Success",
                "fromAttachedDisks": []
            },
            {
                "date": "2019-10-12",
                "createdAt": 1570861072.0,
                "status": "Success",
                "fromAttachedDisks": []
            },
            {
                "date": "2019-10-11",
                "createdAt": 1570774672.0,
                "status": "Success",
                "fromAttachedDisks": []
            }
        ]
    }

For more information, see `Keeping automatic snapshots of instances or disks in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-keeping-automatic-snapshots>`__ in the *Lightsail Dev Guide*.
