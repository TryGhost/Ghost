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
                heading: 'Congrats! You got your first 100 members.',
                content: [
                    'All the hard work in getting your publication up and running paid off, and your work has since gone on to inspire more than <strong>100 people</strong> to sign up. This is the first major milestone in growing an online audience, and you\'ve made it here!',
                    'So what\'s next?',
                    'If you keep up the great work you\'ll be well on your way to growing an even bigger audience. In the meantime, if you\'re looking for some actionable advice about how to reach the next major milestones, check out these tips for <a href="https://ghost.org/resources/first-1000-email-subscribers/">how to grow an audience of 100 to 1,000</a>.',
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
                    `Congrats, <strong>${siteTitle}</strong> has officially reached <strong>1,000 member</strong> signups.`,
                    'This is such an impressive milestone and according to Kevin Kelly\'s true fan <a href="https://kk.org/thetechnium/1000-true-fans/">theory</a>, it means you now have a direct relationship with enough people to run a truly independent creator business online.',
                    'Imagine 1,000 people all in one room at the same time. That\'s a lot of people. It\'s also how many people are happy that you show up to create your work. Very cool. Keep up the great work!'
                ],
                ctaText: 'Login to see your member stats',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-1000.png'
                }
            },
            10000: {
                subject: `${siteTitle} now has 10k members`,
                heading: `Big news: You reached ${formattedValue} member signups`,
                content: [
                    `There are now <strong>10k people</strong> who enjoy <strong>${siteTitle}</strong> enough to give you their email addresses and become members.`,
                    'Building an audience of any size as an independent creator requires dedication, but reaching this incredible milestone is an impressive feat worth celebrating. There\'s no stopping you now, keep up the great work!'
                ],
                ctaText: 'Go to your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-10k.png'
                }
            },
            25000: {
                subject: `${siteTitle} now has 25k members`,
                heading: `You have an audience of ${formattedValue} people`,
                content: [
                    'Congrats, what an incredible milestone you have reached with <strong>25k members</strong> choosing to support and follow your work. That\'s a big enough audience to sell out Madison Square Garden.',
                    'It takes a lot of work and dedication to build an audience as an independent creator, so here\'s to recognizing what you\'ve achieved.',
                    'Keep up the great work. You\'ll be able to sell out Madison Square Garden twice in no time!'
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
                    `It's time to pop the champagne. <strong>${siteTitle}</strong> has officially reached the <strong>50,000 members</strong> milestone. You almost have enough members to fill a Superbowl event 🏈`,
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
                    'Congratulations &mdash; your work has attracted the support of <strong>100,000 people</strong> from around the world. Fun fact: This means you have enough people in your audience to fill any of the largest stadiums in the United States.',
                    'Whatever you\'re doing, it\'s working. The sky is the limit from here. Keep up the great work (but first, go and celebrate this impressive milestone, you earned it).'
                ],
                ctaText: 'Go to your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-100k.png'
                }
            },
            250000: {
                subject: `${siteTitle} now has 250k members`,
                heading: `Your audience has grown to ${formattedValue} people`,
                content: [
                    `You're officially in the top 5% of creators using Ghost. <strong>One-quarter of a million people</strong> like <strong>${siteTitle}</strong> and decided to subscribe. That's the same number of people who make up the crowds at the SXSW festival.`,
                    'Reaching this milestone is no easy feat, so make sure you take some time to recognize how far you\'ve come.',
                    'Keep up the amazing work!'
                ],
                ctaText: 'Go to your dashboard',
                image: {
                    url: 'https://static.ghost.org/v5.0.0/images/milestone-email-members-250k.png'
                }
            },
            500000: {
                subject: `${siteTitle} has ${formattedValue} members`,
                heading: `Half a million members, and counting!`,
                content: [
                    `Congrats, <strong>${siteTitle}</strong> has officially attracted an audience of more than <strong>500,000 people</strong>. That's more people than the national population of Iceland!`,
                    'You\'re also officially in the top 3% of creators using Ghost.',
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
                    `Congratulations! The <strong>${siteTitle}</strong> audience is now officially bigger than the crowds at the Coachella festival, and you're in the top 1% of creators using Ghost. Right now would be a good time to start writing your acceptance speech.`,
                    'In all seriousness this is an incredible milestone and something to be very proud of. Not many people build an audience of this size as an independent creator, and hopefully you\'ll get the opportunity to celebrate with your community.',
                    'Keep it up, you\'re creating amazing value in the world!'
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
