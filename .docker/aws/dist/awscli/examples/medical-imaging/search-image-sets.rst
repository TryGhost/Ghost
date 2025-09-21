**Example 1: To search image sets with an EQUAL operator**

The following ``search-image-sets`` code example uses the EQUAL operator to search image sets based on a specific value. ::

    aws medical-imaging search-image-sets \
        --datastore-id 12345678901234567890123456789012 \
        --search-criteria file://search-criteria.json

Contents of ``search-criteria.json`` ::

    {
        "filters": [{
            "values": [{"DICOMPatientId" : "SUBJECT08701"}],
            "operator": "EQUAL"
        }]
    }

Output::

    {
        "imageSetsMetadataSummaries": [{
            "imageSetId": "09876543210987654321098765432109",
            "createdAt": "2022-12-06T21:40:59.429000+00:00",
            "version": 1,
            "DICOMTags": {
                "DICOMStudyId": "2011201407",
                "DICOMStudyDate": "19991122",
                 "DICOMPatientSex": "F",
                 "DICOMStudyInstanceUID": "1.2.840.99999999.84710745.943275268089",
                 "DICOMPatientBirthDate": "19201120",
                 "DICOMStudyDescription": "UNKNOWN",
                 "DICOMPatientId": "SUBJECT08701",
                 "DICOMPatientName": "Melissa844 Huel628",
                 "DICOMNumberOfStudyRelatedInstances": 1,
                 "DICOMStudyTime": "140728",
                 "DICOMNumberOfStudyRelatedSeries": 1
                },
            "updatedAt": "2022-12-06T21:40:59.429000+00:00"
        }]
    }

**Example 2: To search image sets with a BETWEEN operator using DICOMStudyDate and DICOMStudyTime**

The following ``search-image-sets`` code example searches for image sets with DICOM Studies generated between January 1, 1990 (12:00 AM) and January 1, 2023 (12:00 AM).

Note:
DICOMStudyTime is optional. If it is not present, 12:00 AM (start of the day) is the time value for the dates provided for filtering. ::

    aws medical-imaging search-image-sets \
        --datastore-id 12345678901234567890123456789012 \
        --search-criteria file://search-criteria.json

Contents of ``search-criteria.json`` ::

    {
        "filters": [{
            "values": [{
                "DICOMStudyDateAndTime": {
                    "DICOMStudyDate": "19900101",
                    "DICOMStudyTime": "000000"
                }
            },
            {
                "DICOMStudyDateAndTime": {
                    "DICOMStudyDate": "20230101",
                    "DICOMStudyTime": "000000"
                }
            }],
            "operator": "BETWEEN"
        }]
    }

Output::

    {
        "imageSetsMetadataSummaries": [{
            "imageSetId": "09876543210987654321098765432109",
            "createdAt": "2022-12-06T21:40:59.429000+00:00",
            "version": 1,
            "DICOMTags": {
                "DICOMStudyId": "2011201407",
                "DICOMStudyDate": "19991122",
                "DICOMPatientSex": "F",
                "DICOMStudyInstanceUID": "1.2.840.99999999.84710745.943275268089",
                "DICOMPatientBirthDate": "19201120",
                "DICOMStudyDescription": "UNKNOWN",
                "DICOMPatientId": "SUBJECT08701",
                "DICOMPatientName": "Melissa844 Huel628",
                "DICOMNumberOfStudyRelatedInstances": 1,
                "DICOMStudyTime": "140728",
                "DICOMNumberOfStudyRelatedSeries": 1
            },
            "updatedAt": "2022-12-06T21:40:59.429000+00:00"
        }]
    }

**Example 3: To search image sets with a BETWEEN operator using createdAt (time studies were previously persisted)**

The following ``search-image-sets`` code example searches for image sets with DICOM Studies persisted in HealthImaging between the time ranges in UTC time zone.

Note:
Provide createdAt in example format ("1985-04-12T23:20:50.52Z"). ::

    aws medical-imaging search-image-sets \
        --datastore-id 12345678901234567890123456789012 \
        --search-criteria  file://search-criteria.json


Contents of ``search-criteria.json`` ::

    {
        "filters": [{
            "values": [{
                "createdAt": "1985-04-12T23:20:50.52Z"
            },
            {
                "createdAt": "2022-04-12T23:20:50.52Z"
            }],
            "operator": "BETWEEN"
        }]
    }

Output::

    {
        "imageSetsMetadataSummaries": [{
            "imageSetId": "09876543210987654321098765432109",
            "createdAt": "2022-12-06T21:40:59.429000+00:00",
            "version": 1,
            "DICOMTags": {
                "DICOMStudyId": "2011201407",
                "DICOMStudyDate": "19991122",
                "DICOMPatientSex": "F",
                "DICOMStudyInstanceUID": "1.2.840.99999999.84710745.943275268089",
                "DICOMPatientBirthDate": "19201120",
                "DICOMStudyDescription": "UNKNOWN",
                "DICOMPatientId": "SUBJECT08701",
                "DICOMPatientName": "Melissa844 Huel628",
                "DICOMNumberOfStudyRelatedInstances": 1,
                "DICOMStudyTime": "140728",
                "DICOMNumberOfStudyRelatedSeries": 1
            },
            "lastUpdatedAt": "2022-12-06T21:40:59.429000+00:00"
        }]
    }

**Example 4: To search image sets with an EQUAL operator on DICOMSeriesInstanceUID and BETWEEN on updatedAt and sort response in ASC order on updatedAt field**

The following ``search-image-sets`` code example searches for image sets with an EQUAL operator on DICOMSeriesInstanceUID and BETWEEN on updatedAt and sort response in ASC order on updatedAt field.

Note:
Provide updatedAt in example format ("1985-04-12T23:20:50.52Z"). ::

    aws medical-imaging search-image-sets \
        --datastore-id 12345678901234567890123456789012 \
        --search-criteria  file://search-criteria.json


Contents of ``search-criteria.json`` ::

    {
        "filters": [{
            "values": [{
                "updatedAt": "2024-03-11T15:00:05.074000-07:00"
            }, {
                "updatedAt": "2024-03-11T16:00:05.074000-07:00"
            }],
            "operator": "BETWEEN"
        }, {
            "values": [{
                "DICOMSeriesInstanceUID": "1.2.840.99999999.84710745.943275268089"
            }],
            "operator": "EQUAL"
        }],
        "sort": {
            "sortField": "updatedAt",
            "sortOrder": "ASC"
        }
    }

Output::

    {
        "imageSetsMetadataSummaries": [{
            "imageSetId": "09876543210987654321098765432109",
            "createdAt": "2022-12-06T21:40:59.429000+00:00",
            "version": 1,
            "DICOMTags": {
                "DICOMStudyId": "2011201407",
                "DICOMStudyDate": "19991122",
                "DICOMPatientSex": "F",
                "DICOMStudyInstanceUID": "1.2.840.99999999.84710745.943275268089",
                "DICOMPatientBirthDate": "19201120",
                "DICOMStudyDescription": "UNKNOWN",
                "DICOMPatientId": "SUBJECT08701",
                "DICOMPatientName": "Melissa844 Huel628",
                "DICOMNumberOfStudyRelatedInstances": 1,
                "DICOMStudyTime": "140728",
                "DICOMNumberOfStudyRelatedSeries": 1
            },
            "lastUpdatedAt": "2022-12-06T21:40:59.429000+00:00"
        }]
    }

For more information, see `Searching image sets <https://docs.aws.amazon.com/healthimaging/latest/devguide/search-image-sets.html>`__ in the *AWS HealthImaging Developer Guide*.
