Get a Description of Default Cluster Parameters
-----------------------------------------------

This example returns a description of the default cluster parameters for the
``redshift-1.0`` family. By default, the output is in JSON format.

Command::

   aws redshift describe-default-cluster-parameters --parameter-group-family redshift-1.0

Result::

    {
       "DefaultClusterParameters": {
       "ParameterGroupFamily": "redshift-1.0",
       "Parameters": [
          {
             "Description": "Sets the display format for date and time values.",
             "DataType": "string",
             "IsModifiable": true,
             "Source": "engine-default",
             "ParameterValue": "ISO, MDY",
             "ParameterName": "datestyle"
          },
          {
             "Description": "Sets the number of digits displayed for floating-point values",
             "DataType": "integer",
             "IsModifiable": true,
             "AllowedValues": "-15-2",
             "Source": "engine-default",
             "ParameterValue": "0",
             "ParameterName": "extra_float_digits"
          },
          (...remaining output omitted...)
          ]
       }
    }

.. tip:: To see a list of valid parameter group families, use the ``describe-cluster-parameter-groups`` command.

