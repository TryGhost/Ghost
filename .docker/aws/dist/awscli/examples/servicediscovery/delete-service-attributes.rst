**To delete a service attribute**

The following ``delete-service-attributes`` example deletes a service attribute with the key ``Port`` that is associated with the specified service. ::

    aws servicediscovery delete-service-attributes \
        --service-id srv-e4anhexample0004 \
        --attributes Port

This command produces no output.

For more information, see `Deleting namespaces <https://docs.aws.amazon.com/cloud-map/latest/dg/deleting-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.
