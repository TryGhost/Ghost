**Example 1: To publish a message to a topic**

The following ``publish`` example publishes the specified message to the specified SNS topic. The message comes from a text file, which enables you to include line breaks. ::

    aws sns publish \
        --topic-arn "arn:aws:sns:us-west-2:123456789012:my-topic" \
        --message file://message.txt

Contents of ``message.txt``::

    Hello World
    Second Line

Output::

    {
        "MessageId": "123a45b6-7890-12c3-45d6-111122223333"
    }

**Example 2: To publish an SMS message to a phone number**

The following ``publish`` example publishes the message ``Hello world!`` to the phone number ``+1-555-555-0100``. ::

    aws sns publish \
        --message "Hello world!" \
        --phone-number +1-555-555-0100

Output::

    {
        "MessageId": "123a45b6-7890-12c3-45d6-333322221111"
    }
