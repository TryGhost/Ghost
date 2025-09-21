Describe All Events
-------------------

this example returns all events. By default, the output is in JSON format.

Command::

   aws redshift describe-events

Result::

    {
       "Events": [
          {
          "Date": "2013-01-22T19:17:03.640Z",
          "SourceIdentifier": "myclusterparametergroup",
          "Message": "Cluster parameter group myclusterparametergroup has been created.",
          "SourceType": "cluster-parameter-group"
          } ],
       "ResponseMetadata": {
          "RequestId": "9f056111-64c9-11e2-9390-ff04f2c1e638"
       }
    }

You can also obtain the same information in text format using the ``--output text`` option.

Command::

   aws redshift describe-events --output text

Result::

    2013-01-22T19:17:03.640Z	myclusterparametergroup	Cluster parameter group myclusterparametergroup has been created.	cluster-parameter-group
    RESPONSEMETADATA	8e5fe765-64c9-11e2-bce3-e56f52c50e17


