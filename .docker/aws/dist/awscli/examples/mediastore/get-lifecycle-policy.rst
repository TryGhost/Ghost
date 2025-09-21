**To view an object lifecycle policy**

The following ``get-lifecycle-policy`` example displays the object lifecycle policy attached to the specified container. ::

    aws mediastore get-lifecycle-policy \
        --container-name LiveEvents

Output::

   {
       "LifecyclePolicy": {
           "rules": [
               {
                   "definition": {
                       "path": [
                           {
                               "prefix": "Football/"
                           },
                           {
                               "prefix": "Baseball/"
                           }
                       ],
                       "days_since_create": [
                           {
                               "numeric": [
                                   ">",
                                   28
                               ]
                           }
                       ]
                   },
                   "action": "EXPIRE"
               }
           ]
       }
   }

For more information, see `Viewing an Object Lifecycle Policy <https://docs.aws.amazon.com/mediastore/latest/ug/policies-object-lifecycle-view.html>`__ in the *AWS Elemental MediaStore User Guide*.
