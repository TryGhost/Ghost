/**
 *
 * @param {string} siteTitle
 * @param {string} formattedValue
 *
 * @returns {Object.<string, object>}
 */
const milestoneEmailConfig = (siteTitle, formattedValue) => {
    const arrContent = {
        subject: `${siteTitle} hit ${formattedValue} ARR`,
        heading: `Congrats! You reached ${formattedValue} ARR`,
        content: [
            `<strong>${siteTitle}</strong> is now generating <strong>${formattedValue}</strong> in annual recurring revenue. Congratulations &mdash; this is a significant milestone.`,
            'Subscription revenue is predictable and sustainable, meaning you can keep focusing on delivering great content while watching your business grow. Keep up the great work. See you at the next milestone!'
        ],
        ctaText: 'Login to your dashboard'
    };

    return {
        // For ARR we use the same content and only the image changes
        // Should we start to support different currencies, we'll need
        // to update the structure for ARR content to reflect that.
        arr: {
            100: {
                ...arrContent,
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-usd-100.png',
                    height: 348
                }
            },
            1000: {
                ...arrContent,
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-usd-1000.png',
                    height: 348
                }
            },
            10000: {
                ...arrContent,
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-usd-10k.png',
                    height: 348
                }
            },
            50000: {
                ...arrContent,
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-usd-50k.png',
                    height: 348
                }
            },
            100000: {
                ...arrContent,
                heading: `Congrats! You reached $100k ARR`,
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-usd-100k.png',
                    height: 348
                }
            },
            250000: {
                ...arrContent,
                heading: `Congrats! You reached $250k ARR`,
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-usd-250k.png',
                    height: 348
                }
            },
            500000: {
                ...arrContent,
                heading: `Congrats! You reached $500k ARR`,
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-usd-500k.png',
                    height: 348
                }
            },
            1000000: {
                ...arrContent,
                heading: `Congrats! You reached $1m ARR`,
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-usd-1m.png',
                    height: 348
                }
            }
        },
        members: {
            100: {
                subject: `${siteTitle} has ${formattedValue} members 🤗`,
                heading: `Milestone achieved: ${formattedValue} signups`,
                content: [
                    'All the hard work in getting your publication up and running paid off, and your work has since gone on to inspire more than <strong>100 people</strong> to sign up. This is the first major milestone in growing an online audience, and you’ve made it here!',
                    'So what’s next?',
                    'If you keep up the great work you’ll be well on your way to growing an even bigger audience. In the meantime, here’s some actionable advice about <strong><a href="https://ghost.org/resources/first-1000-email-subscribers/">how to reach the next major milestones</a></strong>.',
                    'You got this!'
                ],
                ctaText: 'Login to your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-100.png'
                }
            },
            1000: {
                subject: `${siteTitle} now has ${formattedValue} members`,
                heading: `You have ${formattedValue} true fans`,
                content: [
                    `Congrats, <strong>${siteTitle}</strong> has officially reached <strong>${formattedValue} member signups</strong>.`,
                    'This is such an impressive milestone and according to Kevin Kelly’s true fan <a href="https://kk.org/thetechnium/1000-true-fans/">theory</a>, it means you now have a direct relationship with enough people to run a truly independent creator business online.',
                    `Imagine ${formattedValue} people all in one room at the same time. That's a lot of people. It's also how many people are happy that you show up to create your work. Very cool. Keep up the great work!`
                ],
                ctaText: 'See your member stats',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-1000.png'
                }
            },
            10000: {
                subject: `${siteTitle} now has 10k members`,
                heading: 'Huge success: 10k members',
                content: [
                    `There are now <strong>10k people</strong> who enjoy <strong>${siteTitle}</strong> so much they decided to sign up as members.`,
                    'Building an audience of any size as an independent creator requires dedication, and reaching this incredible milestone is an impressive feat worth celebrating. There’s no stopping you now, keep up the great work!'
                ],
                ctaText: 'Go to your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-10k.png'
                }
            },
            25000: {
                subject: `${siteTitle} now has 25k members`,
                heading: `Celebrating ${formattedValue} signups`,
                content: [
                    'Congrats, <strong>25k people</strong> have chosen to support and follow your work. That’s an audience big enough to sell out Madison Square Garden. What an incredible milestone!',
                    'It takes a lot of work and dedication to build an audience as an independent creator, so here’s to recognizing what you’ve achieved.',
                    'Keep up the great work!'
                ],
                ctaText: 'View your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-25k.png'
                }
            },
            50000: {
                subject: `${siteTitle} now has 50k members`,
                heading: `${formattedValue} people love your work`,
                content: [
                    `It's time to pop the champagne because <strong>${siteTitle}</strong> has officially reached <strong>50k members</strong>. At this rate of growth you can almost fill a Superbowl stadium 🏈`,
                    'Building an audience of this size is an incredible achievement, so hats off to you. Keep up the amazing work.',
                    'See you at the next milestone!'
                ],
                ctaText: 'Go to your Dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-50k.png'
                }
            },
            100000: {
                subject: `${siteTitle} just hit 100k members!`,
                heading: `You just reached ${formattedValue} members`,
                content: [
                    'Congratulations &mdash; your work has attracted an audience of <strong>100k people</strong> from around the world. Fun fact: Your audience is now big enough to fill any of the largest stadiums in the United States.',
                    'Whatever you’re doing, it’s working. The sky is the limit from here. Keep up the great work (but first, go and celebrate this impressive milestone, you earned it).'
                ],
                ctaText: 'Go to your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-100k.png'
                }
            },
            250000: {
                subject: `${siteTitle} now has 250k members`,
                heading: 'Celebrating 250k member signups',
                content: [
                    `One-quarter of a million people enjoy and support <strong>${siteTitle}</strong>. That’s the same number of people who make up the crowds at the SXSW festival.`,
                    'You’re officially in the top 5% of creators using Ghost 🚀',
                    'Reaching this milestone is no easy feat, so make sure you take some time to recognize how far you’ve come.',
                    'Keep up the amazing work!'
                ],
                ctaText: 'Go to your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-250k.png'
                }
            },
            500000: {
                subject: `${siteTitle} has ${formattedValue} members`,
                heading: `Half a million members!`,
                content: [
                    `Congrats, <strong>${siteTitle}</strong> has officially attracted an audience of more than <strong>${formattedValue} people</strong>, and counting.`,
                    'You’re officially in the top 3% of creators using Ghost. ',
                    'It takes a huge amount of hard work and dedication to build an audience of this size. It is a testament to how much value your work is providing to thousands of people all over the world. Keep up the great work, and make sure to take the time to celebrate this incredible milestone.'
                ],
                ctaText: 'Login to your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-500k.png'
                }
            },
            1000000: {
                subject: `${siteTitle} has 1 million members`,
                heading: `You did it. 1 million members 🏆`,
                content: [
                    `Start writing your acceptance speech! The <strong>${siteTitle}</strong> audience is now officially big enough to headline an event at the Copacabana, with more than <strong>1 million members</strong>. That puts you in the top 1% of creators using Ghost.`,
                    'In all seriousness, this is an <em>incredible</em> achievement and something to be very proud of. You deserve all the credit as a truly independent creator.',
                    'Keep it up, you’re creating amazing value in the world!'
                ],
                ctaText: 'Go to your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-1m.png'
                }
            }
        }
    };
};

module.exports = milestoneEmailConfig;
