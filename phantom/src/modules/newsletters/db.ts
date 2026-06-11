import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const newsletterTable = sqliteTable('newsletters', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug'),
    description: text('description'),
    senderName: text('sender_name'),
    senderEmail: text('sender_email'),
    senderReplyTo: text('sender_reply_to'),
    status: text('status').notNull().default('active'),
    subscribeOnSignup: integer('subscribe_on_signup').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const issueTable = sqliteTable('issues', {
    id: text('id').primaryKey(),
    newsletterId: text('newsletter_id').notNull(),
    subject: text('subject').notNull(),
    status: text('status').notNull(),
    sendAt: integer('send_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const deliveryJobTable = sqliteTable('delivery_jobs', {
    id: text('id').primaryKey(),
    issueId: text('issue_id').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull()
});

export const issueDeliveryTable = sqliteTable('issue_deliveries', {
    id: text('id').primaryKey(),
    issueId: text('issue_id').notNull(),
    memberId: text('member_id').notNull(),
    status: text('status').notNull(),
    error: text('error'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const suppressionTable = sqliteTable('email_suppressions', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    reason: text('reason').notNull(),
    source: text('source').notNull(),
    createdAt: integer('created_at').notNull()
});

export const emailEventTable = sqliteTable('email_events', {
    id: text('id').primaryKey(),
    issueId: text('issue_id'),
    memberId: text('member_id'),
    type: text('type').notNull(),
    payload: text('payload').notNull(),
    createdAt: integer('created_at').notNull()
});

export const automatedEmailTable = sqliteTable('automated_emails', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    type: text('type').notNull(),
    status: text('status').notNull(),
    error: text('error'),
    createdAt: integer('created_at').notNull()
});

// Automated email templates (welcome emails); the per-member send log
// stays in automated_emails above.
export const automatedEmailDefinitionTable = sqliteTable('automated_email_definitions', {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('inactive'),
    subject: text('subject').notNull(),
    lexical: text('lexical'),
    senderName: text('sender_name'),
    senderEmail: text('sender_email'),
    senderReplyTo: text('sender_reply_to'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at')
});

export const newsletterMembershipTable = sqliteTable('newsletter_memberships', {
    id: text('id').primaryKey(),
    newsletterId: text('newsletter_id').notNull(),
    memberId: text('member_id').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const emailTemplateTable = sqliteTable('email_templates', {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    status: text('status').notNull(),
    updatedAt: integer('updated_at').notNull(),
    createdAt: integer('created_at').notNull()
});

export const emailBatchTable = sqliteTable('email_batches', {
    id: text('id').primaryKey(),
    issueId: text('issue_id').notNull(),
    segment: text('segment').notNull(),
    status: text('status').notNull(),
    batchSize: integer('batch_size').notNull(),
    attempt: integer('attempt').notNull(),
    maxAttempts: integer('max_attempts').notNull(),
    nextAttemptAt: integer('next_attempt_at').notNull(),
    senderEmail: text('sender_email').notNull(),
    replyToEmail: text('reply_to_email').notNull(),
    supportEmail: text('support_email').notNull(),
    senderName: text('sender_name').notNull(),
    trackingEnabled: integer('tracking_enabled').notNull(),
    outboundTaggingEnabled: integer('outbound_tagging_enabled').notNull(),
    includeCommentCta: integer('include_comment_cta').notNull(),
    warmupDomain: text('warmup_domain').notNull(),
    warmupLimit: integer('warmup_limit').notNull(),
    lastError: text('last_error'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const emailBatchRecipientTable = sqliteTable('email_batch_recipients', {
    id: text('id').primaryKey(),
    batchId: text('batch_id').notNull(),
    memberId: text('member_id').notNull(),
    status: text('status').notNull(),
    personalizedSubject: text('personalized_subject'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export type NewsletterRecord = typeof newsletterTable.$inferSelect;
export type NewNewsletterRecord = typeof newsletterTable.$inferInsert;
export type IssueRecord = typeof issueTable.$inferSelect;
export type NewIssueRecord = typeof issueTable.$inferInsert;
export type DeliveryJobRecord = typeof deliveryJobTable.$inferSelect;
export type NewDeliveryJobRecord = typeof deliveryJobTable.$inferInsert;
export type IssueDeliveryRecord = typeof issueDeliveryTable.$inferSelect;
export type NewIssueDeliveryRecord = typeof issueDeliveryTable.$inferInsert;
export type SuppressionRecord = typeof suppressionTable.$inferSelect;
export type NewSuppressionRecord = typeof suppressionTable.$inferInsert;
export type EmailEventRecord = typeof emailEventTable.$inferSelect;
export type NewEmailEventRecord = typeof emailEventTable.$inferInsert;
export type AutomatedEmailRecord = typeof automatedEmailTable.$inferSelect;
export type NewAutomatedEmailRecord = typeof automatedEmailTable.$inferInsert;
export type AutomatedEmailDefinitionRecord = typeof automatedEmailDefinitionTable.$inferSelect;
export type NewAutomatedEmailDefinitionRecord = typeof automatedEmailDefinitionTable.$inferInsert;
export type NewsletterMembershipRecord = typeof newsletterMembershipTable.$inferSelect;
export type NewNewsletterMembershipRecord = typeof newsletterMembershipTable.$inferInsert;
export type EmailTemplateRecord = typeof emailTemplateTable.$inferSelect;
export type NewEmailTemplateRecord = typeof emailTemplateTable.$inferInsert;
export type EmailBatchRecord = typeof emailBatchTable.$inferSelect;
export type NewEmailBatchRecord = typeof emailBatchTable.$inferInsert;
export type EmailBatchRecipientRecord = typeof emailBatchRecipientTable.$inferSelect;
export type NewEmailBatchRecipientRecord = typeof emailBatchRecipientTable.$inferInsert;
