const PostsImporter = require('./posts');
const NewslettersImporter = require('./newsletters');
const UsersImporter = require('./users');
const PostsAuthorsImporter = require('./posts-authors');
const TagsImporter = require('./tags');
const PostsTagsImporter = require('./posts-tags');
const ProductsImporter = require('./products');
const MembersImporter = require('./members');
const BenefitsImporter = require('./benefits');
const ProductsBenefitsImporter = require('./products-benefits');
const MembersProductsImporter = require('./members-products');
const PostsProductsImporter = require('./posts-products');
const MembersNewslettersImporter = require('./members-newsletters');
const MembersCreatedEventsImporter = require('./members-created-events');
const MembersLoginEventsImporter = require('./members-login-events');
const MembersStatusEventsImporter = require('./members-status-events');
const StripeProductsImporter = require('./stripe-products');
const StripePricesImporter = require('./stripe-prices');
const SubscriptionsImporter = require('./subscriptions');
const MembersStripeCustomersImporter = require('./members-stripe-customers');
const MembersStripeCustomersSubscriptionsImporter = require('./members-stripe-customers-subscriptions');
const MembersPaidSubscriptionEventsImporter = require('./members-paid-subscription-events');
const MembersSubscriptionCreatedEventsImporter = require('./members-subscription-created-events');
const MembersSubscribeEventsImporter = require('./members-subscribe-events');

module.exports = {
    PostsImporter,
    NewslettersImporter,
    UsersImporter,
    PostsAuthorsImporter,
    TagsImporter,
    PostsTagsImporter,
    ProductsImporter,
    MembersImporter,
    BenefitsImporter,
    ProductsBenefitsImporter,
    MembersProductsImporter,
    PostsProductsImporter,
    MembersNewslettersImporter,
    MembersCreatedEventsImporter,
    MembersLoginEventsImporter,
    MembersStatusEventsImporter,
    StripeProductsImporter,
    StripePricesImporter,
    SubscriptionsImporter,
    MembersStripeCustomersImporter,
    MembersStripeCustomersSubscriptionsImporter,
    MembersPaidSubscriptionEventsImporter,
    MembersSubscriptionCreatedEventsImporter,
    MembersSubscribeEventsImporter
};
