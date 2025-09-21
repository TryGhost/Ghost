**To describe all Amazon DocumentDB event categories**

The following ``describe-event-categories`` example lists all categories for the Amazon DocumentDB event source type ``db-instance``. ::

    aws docdb describe-event-categories \
        --source-type db-cluster

Output::

   {
       "EventCategoriesMapList": [
           {
               "SourceType": "db-cluster",
               "EventCategories": [
                   "failover",
                   "maintenance",
                   "notification",
                   "failure"
               ]
           }
       ]
   }

For more information, see `Viewing Event Categories <https://docs.aws.amazon.com/ documentdb/latest/developerguide/managing-events.html#viewing-event-categories>`__ in the *Amazon DocumentDB Developer Guide*.
