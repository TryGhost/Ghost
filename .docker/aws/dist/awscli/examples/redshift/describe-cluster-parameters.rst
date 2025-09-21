Retrieve the Parameters for a Specified Cluster Parameter Group
---------------------------------------------------------------

This example retrieves the parameters for the named parameter group.  By default, the output is in JSON format.

Command::

   aws redshift describe-cluster-parameters --parameter-group-name myclusterparametergroup

Result::

    {
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

You can also obtain the same information in text format using the ``--output text`` option.

Command::

   aws redshift describe-cluster-parameters --parameter-group-name myclusterparametergroup --output text

Result::

    RESPONSEMETADATA	cdac40aa-64cc-11e2-9e70-918437dd236d
    Sets the display format for date and time values.	string	True	engine-default	ISO, MDY	datestyle
    Sets the number of digits displayed for floating-point values	integer	True	-15-2	engine-default	0	extra_float_digits
    This parameter applies a user-defined label to a group of queries that are run during the same session..	string	True	engine-default	default	query_group
    require ssl for all databaseconnections	boolean	True	true,false	engine-default	false	require_ssl
    Sets the schema search order for names that are not schema-qualified.	string	True	engine-default	$user, public	search_path
    Aborts any statement that takes over the specified number of milliseconds.	integer	True	engine-default	0	statement_timeout
    wlm json configuration	string	True	engine-default	\[{"query_concurrency":5}]	wlm_json_configuration


