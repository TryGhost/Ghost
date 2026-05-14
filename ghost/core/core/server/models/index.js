/* eslint-disable max-lines */

/**
 * Dependencies
 */

const Base = require('./base');
const {Action} = require('./action');
const {ApiKey, ApiKeys} = require('./api-key');
const {Author, Authors} = require('./author');
const {AutomatedEmailRecipient, AutomatedEmailRecipients} = require('./automated-email-recipient');
const {Benefit, Benefits} = require('./benefit');
const {CollectionPost} = require('./collection-post');
const {Collection} = require('./collection');
const {CommentLike} = require('./comment-like');
const {CommentReport} = require('./comment-report');
const {Comment} = require('./comment');
const {CustomThemeSetting} = require('./custom-theme-setting');
const {DonationPaymentEvent} = require('./donation-payment-event');
const {EmailBatch, EmailBatches} = require('./email-batch');
const {EmailDesignSetting} = require('./email-design-setting');
const {EmailRecipientFailure} = require('./email-recipient-failure');
const {EmailRecipient, EmailRecipients} = require('./email-recipient');
const {EmailSpamComplaintEvent} = require('./email-spam-complaint-event');
const {Email, Emails} = require('./email');
const {Gift} = require('./gift');
const {Integration, Integrations} = require('./integration');
const {Invite, Invites} = require('./invite');
const {Job} = require('./job');
const {Label, Labels} = require('./label');
const {MemberCancelEvent, MemberCancelEvents} = require('./member-cancel-event');
const {MemberClickEvent} = require('./member-click-event');
const {MemberCreatedEvent} = require('./member-created-event');
const {MemberEmailChangeEvent, MemberEmailChangeEvents} = require('./member-email-change-event');
const {MemberFeedback} = require('./member-feedback');
const {MemberLoginEvent, MemberLoginEvents} = require('./member-login-event');
const {MemberNewsletter} = require('./member-newsletter');
const {MemberPaidSubscriptionEvent, MemberPaidSubscriptionEvents} = require('./member-paid-subscription-event');
const {MemberPaymentEvent, MemberPaymentEvents} = require('./member-payment-event');
const {MemberProductEvent, MemberProductEvents} = require('./member-product-event');
const {MemberStatusEvent, MemberStatusEvents} = require('./member-status-event');
const {MemberStripeCustomer} = require('./member-stripe-customer');
const {MemberSubscribeEvent, MemberSubscribeEvents} = require('./member-subscribe-event');
const {Member, Members} = require('./member');
const {Mention} = require('./mention');
const {Milestone} = require('./milestone');
const {MobiledocRevision} = require('./mobiledoc-revision');
const {Newsletter} = require('./newsletter');
const {OfferRedemption} = require('./offer-redemption');
const {Offer} = require('./offer');
const {Outbox} = require('./outbox');
const {Permission, Permissions} = require('./permission');
const {PostRevision} = require('./post-revision');
const {Post, Posts} = require('./post');
const {PostsMeta} = require('./posts-meta');
const {Product, Products} = require('./product');
const {RecommendationClickEvent} = require('./recommendation-click-event');
const {RecommendationSubscribeEvent} = require('./recommendation-subscribe-event');
const {Recommendation} = require('./recommendation');
const {Redirect} = require('./redirect');
const {setIsRoles, checkUserPermissionsForRole} = require('./role-utils');
const {Role, Roles} = require('./role');
const {Session, Sessions} = require('./session');
const {Settings, getOrGenerateSiteUuid} = require('./settings');
const {SingleUseToken, SingleUseTokens} = require('./single-use-token');
const {Snippet, Snippets} = require('./snippet');
const {StripeCustomerSubscription} = require('./stripe-customer-subscription');
const {StripePrice, StripePrices} = require('./stripe-price');
const {StripeProduct, StripeProducts} = require('./stripe-product');
const {SubscriptionCreatedEvent} = require('./subscription-created-event');
const {Suppression} = require('./suppression');
const {TagPublic, TagsPublic} = require('./tag-public');
const {Tag, Tags} = require('./tag');
const {User, Users} = require('./user');
const {Webhook, Webhooks} = require('./webhook');
const {WelcomeEmailAutomatedEmail} = require('./welcome-email-automated-email');
const {WelcomeEmailAutomationRun} = require('./welcome-email-automation-run');
const {WelcomeEmailAutomation} = require('./welcome-email-automation');

// enable event listeners
require('./base/listeners');

/**
 * Expose all models
 */
exports.Base = Base;
exports.Action = Action;
exports.ApiKey = ApiKey;
exports.ApiKeys = ApiKeys;
exports.Author = Author;
exports.Authors = Authors;
exports.AutomatedEmailRecipient = AutomatedEmailRecipient;
exports.AutomatedEmailRecipients = AutomatedEmailRecipients;
exports.Benefit = Benefit;
exports.Benefits = Benefits;
exports.CollectionPost = CollectionPost;
exports.Collection = Collection;
exports.CommentLike = CommentLike;
exports.CommentReport = CommentReport;
exports.Comment = Comment;
exports.CustomThemeSetting = CustomThemeSetting;
exports.DonationPaymentEvent = DonationPaymentEvent;
exports.EmailBatch = EmailBatch;
exports.EmailBatches = EmailBatches;
exports.EmailDesignSetting = EmailDesignSetting;
exports.EmailRecipientFailure = EmailRecipientFailure;
exports.EmailRecipient = EmailRecipient;
exports.EmailRecipients = EmailRecipients;
exports.EmailSpamComplaintEvent = EmailSpamComplaintEvent;
exports.Email = Email;
exports.Emails = Emails;
exports.Gift = Gift;
exports.Integration = Integration;
exports.Integrations = Integrations;
exports.Invite = Invite;
exports.Invites = Invites;
exports.Job = Job;
exports.Label = Label;
exports.Labels = Labels;
exports.MemberCancelEvent = MemberCancelEvent;
exports.MemberCancelEvents = MemberCancelEvents;
exports.MemberClickEvent = MemberClickEvent;
exports.MemberCreatedEvent = MemberCreatedEvent;
exports.MemberEmailChangeEvent = MemberEmailChangeEvent;
exports.MemberEmailChangeEvents = MemberEmailChangeEvents;
exports.MemberFeedback = MemberFeedback;
exports.MemberLoginEvent = MemberLoginEvent;
exports.MemberLoginEvents = MemberLoginEvents;
exports.MemberNewsletter = MemberNewsletter;
exports.MemberPaidSubscriptionEvent = MemberPaidSubscriptionEvent;
exports.MemberPaidSubscriptionEvents = MemberPaidSubscriptionEvents;
exports.MemberPaymentEvent = MemberPaymentEvent;
exports.MemberPaymentEvents = MemberPaymentEvents;
exports.MemberProductEvent = MemberProductEvent;
exports.MemberProductEvents = MemberProductEvents;
exports.MemberStatusEvent = MemberStatusEvent;
exports.MemberStatusEvents = MemberStatusEvents;
exports.MemberStripeCustomer = MemberStripeCustomer;
exports.MemberSubscribeEvent = MemberSubscribeEvent;
exports.MemberSubscribeEvents = MemberSubscribeEvents;
exports.Member = Member;
exports.Members = Members;
exports.Mention = Mention;
exports.Milestone = Milestone;
exports.MobiledocRevision = MobiledocRevision;
exports.Newsletter = Newsletter;
exports.OfferRedemption = OfferRedemption;
exports.Offer = Offer;
exports.Outbox = Outbox;
exports.Permission = Permission;
exports.Permissions = Permissions;
exports.PostRevision = PostRevision;
exports.Post = Post;
exports.Posts = Posts;
exports.PostsMeta = PostsMeta;
exports.Product = Product;
exports.Products = Products;
exports.RecommendationClickEvent = RecommendationClickEvent;
exports.RecommendationSubscribeEvent = RecommendationSubscribeEvent;
exports.Recommendation = Recommendation;
exports.Redirect = Redirect;
exports.setIsRoles = setIsRoles;
exports.checkUserPermissionsForRole = checkUserPermissionsForRole;
exports.Role = Role;
exports.Roles = Roles;
exports.Session = Session;
exports.Sessions = Sessions;
exports.Settings = Settings;
exports.getOrGenerateSiteUuid = getOrGenerateSiteUuid;
exports.SingleUseToken = SingleUseToken;
exports.SingleUseTokens = SingleUseTokens;
exports.Snippet = Snippet;
exports.Snippets = Snippets;
exports.StripeCustomerSubscription = StripeCustomerSubscription;
exports.StripePrice = StripePrice;
exports.StripePrices = StripePrices;
exports.StripeProduct = StripeProduct;
exports.StripeProducts = StripeProducts;
exports.SubscriptionCreatedEvent = SubscriptionCreatedEvent;
exports.Suppression = Suppression;
exports.TagPublic = TagPublic;
exports.TagsPublic = TagsPublic;
exports.Tag = Tag;
exports.Tags = Tags;
exports.User = User;
exports.Users = Users;
exports.Webhook = Webhook;
exports.Webhooks = Webhooks;
exports.WelcomeEmailAutomatedEmail = WelcomeEmailAutomatedEmail;
exports.WelcomeEmailAutomationRun = WelcomeEmailAutomationRun;
exports.WelcomeEmailAutomation = WelcomeEmailAutomation;

function init() {
    // `init` used to be a necessary call, but now it's unnecessary.
    // Ghost(Pro) still calls it, though, so we define a no-op.
    // Once Ghost(Pro) stops calling it, we can remove this function.
    // See the relevant PR in Ghost-Moya.
}

/**
 * Expose `init`
 */

exports.init = init;
