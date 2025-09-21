**To get the master user password for a relational database**

The following ``get-relational-database-master-user-password`` example returns information about the master user password for the specified relational database. ::

    aws lightsail get-relational-database-master-user-password \
        --relational-database-name Database-1

Output::

    {
        "masterUserPassword": "VEXAMPLEec.9qvx,_t<)Wkf)kwboM,>2",
        "createdAt": 1571259453.959
    }
