**To get parameters for a relational database**

The following ``get-relational-database-parameters`` example returns information about all of the available parameters for the specified relational database. ::

    aws lightsail get-relational-database-parameters \
        --relational-database-name Database-1

Output::

    {
        "parameters": [
            {
                "allowedValues": "0,1",
                "applyMethod": "pending-reboot",
                "applyType": "dynamic",
                "dataType": "boolean",
                "description": "Automatically set all granted roles as active after the user has authenticated successfully.",
                "isModifiable": true,
                "parameterName": "activate_all_roles_on_login",
                "parameterValue": "0"
            },
            {
                "allowedValues": "0,1",
                "applyMethod": "pending-reboot",
                "applyType": "static",
                "dataType": "boolean",
                "description": "Controls whether user-defined functions that have only an xxx symbol for the main function can be loaded",
                "isModifiable": false,
                "parameterName": "allow-suspicious-udfs"
            },
            {
                "allowedValues": "0,1",
                "applyMethod": "pending-reboot",
                "applyType": "dynamic",
                "dataType": "boolean",
                "description": "Sets the autocommit mode",
                "isModifiable": true,
                "parameterName": "autocommit"
            },
            {
                "allowedValues": "0,1",
                "applyMethod": "pending-reboot",
                "applyType": "static",
                "dataType": "boolean",
                "description": "Controls whether the server autogenerates SSL key and certificate files in the data directory, if they do not already exist.",
                "isModifiable": false,
                "parameterName": "auto_generate_certs"
            },
            ...
            }
        ]
    }

For more information, see `Updating database parameters in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-updating-database-parameters>`__ in the *Lightsail Dev Guide*.
