**Example 1: To list your registered domains**

The following ``list-domains`` command example lists the ``REGISTERED`` SWF domains that you have registered for your account. ::

    aws swf list-domains \
        --registration-status REGISTERED

Output::

    {
      "domainInfos": [
        {
          "status": "REGISTERED",
          "name": "DataFrobotz"
        },
        {
          "status": "REGISTERED",
          "name": "erontest"
        }
      ]
    }

For more information, see `ListDomains <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_ListDomains.html>`__ in the *Amazon Simple Workflow Service API Reference*

**Example 2: To list your deprecated domains**

The following ``list-domains`` command example lists the ``DEPRECATED`` SWF domains that you have registered for your account. Deprecated domains are domains that can not register new workflows or activities, but that can still be queried. ::

    aws swf list-domains \
        --registration-status DEPRECATED

Output::

    {
      "domainInfos": [
        {
          "status": "DEPRECATED",
          "name": "MyNeatNewDomain"
        }
      ]
    }

For more information, see `ListDomains <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_ListDomains.html>`__ in the *Amazon Simple Workflow Service API Reference*


**Example 3: To list the first page of registered domains**

The following ``list-domains`` command example lists the first page ``REGISTERED`` SWF domains that you have registered for your account using the ``--maximum-page-size`` option. ::

    aws swf list-domains \
        --registration-status REGISTERED \
        --maximum-page-size 1

Output::

    {
        "domainInfos": [
            {
                "status": "REGISTERED",
                "name": "DataFrobotz"
            }
        ],
    "nextPageToken": "AAAAKgAAAAEAAAAAAAAAA2QJKNtidVgd49TTeNwYcpD+QKT2ynuEbibcQWe2QKrslMGe63gpS0MgZGpcpoKttL4OCXRFn98Xif557it+wSZUsvUDtImjDLvguyuyyFdIZtvIxIKEOPm3k2r4OjAGaFsGOuVbrKljvla7wdU7FYH3OlkNCP8b7PBj9SBkUyGoiAghET74P93AuVIIkdKGtQ=="
    }

For more information, see `ListDomains <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_ListDomains.html>`__ in the *Amazon Simple Workflow Service API Reference*

**Example 4: To list the specified single page of registered domains**

The following ``list-domains`` command example lists the first page ``REGISTERED`` SWF domains that you have registered for your account using the ``--maximum-page-size`` option.

When you make the call again, this time supplying the value of ``nextPageToken`` in the ``--next-page-token`` argument, you'll get another page of results. ::

    aws swf list-domains \
        --registration-status REGISTERED \
        --maximum-page-size 1 \
        --next-page-token "AAAAKgAAAAEAAAAAAAAAA2QJKNtidVgd49TTeNwYcpD+QKT2ynuEbibcQWe2QKrslMGe63gpS0MgZGpcpoKttL4OCXRFn98Xif557it+wSZUsvUDtImjDLvguyuyyFdIZtvIxIKEOPm3k2r4OjAGaFsGOuVbrKljvla7wdU7FYH3OlkNCP8b7PBj9SBkUyGoiAghET74P93AuVIIkdKGtQ=="

Output::

    {
        "domainInfos": [
            {
                "status": "REGISTERED",
                "name": "erontest"
            }
        ]
    }

When there are no further pages of results to retrieve, ``nextPageToken`` will not be returned in the results.

For more information, see `ListDomains <https://docs.aws.amazon.com/amazonswf/latest/apireference/API_ListDomains.html>`__ in the *Amazon Simple Workflow Service API Reference*

