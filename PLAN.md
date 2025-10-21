# Ghost Automations Platform - Implementation Plan

## Executive Summary

This document outlines a comprehensive plan for building a native automation system into Ghost, similar to Zapier, n8n, or Make. The goal is to enable Ghost site owners to create automated workflows that respond to events within Ghost and perform actions either within Ghost or external systems, without relying on third-party automation platforms.

**Key Benefits:**
- **Native Integration**: No need for external services or API key management
- **Improved User Experience**: Visual workflow builder integrated into Ghost Admin
- **Better Performance**: Direct database access eliminates webhook latency
- **Advanced Features**: Access to internal Ghost data not exposed via webhooks
- **Cost Savings**: Reduces dependency on paid third-party automation services
- **Privacy**: Keeps data flows within Ghost infrastructure

---

## Current State Analysis

### Existing Infrastructure

Ghost currently has a robust foundation for automation:

**1. Event System** (`ghost/core/core/server/lib/common/events.js`)
- Built on Node.js EventEmitter
- Emits events for all model changes
- Currently used to trigger webhooks

**2. Webhook Service** (`ghost/core/core/server/services/webhooks/`)
- Supports 27 different event types
- HTTP POST to external URLs with HMAC signatures
- Retry logic and error tracking
- Integrated with Integration model

**3. Admin API**
- 64+ endpoint files with comprehensive CRUD operations
- Full content management (posts, pages, members, tags)
- Email operations and newsletter management
- Member subscription management
- File/media uploads
- Advanced analytics

**4. Integration System**
- Custom integrations with API keys
- Zapier integration (currently just documentation and API key display)
- Slack, Unsplash, FirstPromoter, Pintura built-in integrations

### Current Webhook Events

**Post Events:**
- `post.added`, `post.deleted`, `post.edited`
- `post.published`, `post.published.edited`, `post.unpublished`
- `post.scheduled`, `post.unscheduled`, `post.rescheduled`
- `post.tag.attached`, `post.tag.detached`

**Page Events:**
- `page.added`, `page.deleted`, `page.edited`
- `page.published`, `page.published.edited`, `page.unpublished`
- `page.scheduled`, `page.unscheduled`, `page.rescheduled`
- `page.tag.attached`, `page.tag.detached`

**Member Events:**
- `member.added`, `member.edited`, `member.deleted`

**Tag Events:**
- `tag.added`, `tag.edited`, `tag.deleted`

**Site Events:**
- `site.changed`

### Gaps & Opportunities

**Missing Events:**
1. Subscription events (member.subscribed, member.subscription.created, etc.)
2. Email events (email.sent, email.opened, email.clicked)
3. Comment events (comment.added, comment.moderated)
4. Newsletter events (newsletter.sent)
5. Payment events (payment.succeeded, payment.failed)
6. User/staff events (user.login, user.created)

**Missing Actions:**
1. No ability to perform actions in response to events (only webhooks)
2. No conditional logic
3. No multi-step workflows
4. No data transformation
5. No delays or scheduling

---

## Proposed Automation System Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Ghost Admin UI                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Automation Workflow Builder                   │  │
│  │  (React App: apps/automations or admin-x-automations) │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Admin API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Ghost Core Backend                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Automation Engine Service                    │  │
│  │    (ghost/core/core/server/services/automations/)    │  │
│  │                                                        │  │
│  │  • Workflow Executor                                  │  │
│  │  • Trigger Registry                                   │  │
│  │  • Action Registry                                    │  │
│  │  • Condition Evaluator                                │  │
│  │  • Queue Manager (using Bull/BullMQ)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │   Triggers   │ │  Conditions  │ │   Actions    │       │
│  │  - Events    │ │  - Filters   │ │  - Internal  │       │
│  │  - Schedules │ │  - Logic     │ │  - External  │       │
│  │  - Webhooks  │ │  - Data ops  │ │  - HTTP      │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Automation DB   │
                    │   (MySQL/SQLite) │
                    │                  │
                    │  • workflows     │
                    │  • workflow_runs │
                    │  • workflow_logs │
                    └──────────────────┘
```

### Core Components

#### 1. Automation Models

**Workflow Model** (`ghost/core/core/server/models/workflow.js`)
```javascript
{
  id: uuid,
  name: string,
  description: string,
  status: 'active' | 'paused' | 'draft',
  trigger_type: string,        // 'event', 'schedule', 'webhook'
  trigger_config: json,          // Event name, cron expression, etc.
  steps: json,                   // Array of {type: 'action'|'condition', config: {...}}
  created_by: user_id,
  last_run_at: timestamp,
  run_count: integer,
  error_count: integer,
  created_at: timestamp,
  updated_at: timestamp
}
```

**WorkflowRun Model** (`ghost/core/core/server/models/workflow-run.js`)
```javascript
{
  id: uuid,
  workflow_id: uuid,
  status: 'pending' | 'running' | 'completed' | 'failed',
  trigger_data: json,            // Initial event data
  steps_completed: integer,
  started_at: timestamp,
  completed_at: timestamp,
  error: text,
  created_at: timestamp
}
```

**WorkflowLog Model** (`ghost/core/core/server/models/workflow-log.js`)
```javascript
{
  id: uuid,
  workflow_run_id: uuid,
  step_index: integer,
  step_type: string,             // 'trigger', 'condition', 'action'
  step_name: string,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
  input_data: json,
  output_data: json,
  error: text,
  duration_ms: integer,
  created_at: timestamp
}
```

#### 2. Automation Service

**Location:** `ghost/core/core/server/services/automations/`

**Files:**
- `automation-service.js` - Main service coordinator
- `workflow-executor.js` - Executes workflow steps
- `trigger-registry.js` - Manages available triggers
- `action-registry.js` - Manages available actions
- `condition-evaluator.js` - Evaluates conditions
- `queue-manager.js` - Job queue management
- `triggers/` - Trigger implementations
- `actions/` - Action implementations
- `conditions/` - Condition implementations

#### 3. API Endpoints

**Admin API** (`ghost/core/core/server/api/endpoints/workflows.js`)

```javascript
GET    /ghost/api/admin/workflows              // List workflows
GET    /ghost/api/admin/workflows/:id          // Get workflow
POST   /ghost/api/admin/workflows              // Create workflow
PUT    /ghost/api/admin/workflows/:id          // Update workflow
DELETE /ghost/api/admin/workflows/:id          // Delete workflow
PUT    /ghost/api/admin/workflows/:id/activate // Activate workflow
PUT    /ghost/api/admin/workflows/:id/pause    // Pause workflow
POST   /ghost/api/admin/workflows/:id/test     // Test run workflow

GET    /ghost/api/admin/workflow-runs          // List workflow runs
GET    /ghost/api/admin/workflow-runs/:id      // Get run details
GET    /ghost/api/admin/workflow-runs/:id/logs // Get run logs
POST   /ghost/api/admin/workflow-runs/:id/retry // Retry failed run

GET    /ghost/api/admin/automation-triggers    // List available triggers
GET    /ghost/api/admin/automation-actions     // List available actions
GET    /ghost/api/admin/automation-conditions  // List available conditions
```

#### 4. React Admin UI

**Location:** `apps/admin-x-automations/` (new app)

**Key Components:**
- `WorkflowList.tsx` - List all workflows
- `WorkflowBuilder.tsx` - Visual workflow builder
- `WorkflowCanvas.tsx` - Drag-and-drop canvas
- `TriggerSelector.tsx` - Select trigger type
- `ActionSelector.tsx` - Select actions
- `ConditionBuilder.tsx` - Build conditions
- `WorkflowTestPanel.tsx` - Test workflows
- `WorkflowRunHistory.tsx` - View run history
- `WorkflowAnalytics.tsx` - Analytics dashboard

**Design System:** Use `shade` (new design system)

---

## Automation Triggers

### Event-Based Triggers

These triggers fire when specific events occur in Ghost.

#### Content Triggers

**Post Events**
- ✅ `post.published` - When a post is published
- ✅ `post.unpublished` - When a post is unpublished
- ✅ `post.scheduled` - When a post is scheduled
- ✅ `post.updated` - When a published post is updated
- ✅ `post.deleted` - When a post is deleted
- ✅ `post.tag.added` - When a tag is added to a post
- ✅ `post.tag.removed` - When a tag is removed from a post
- 🆕 `post.view.milestone` - When post reaches view count milestone (100, 1000, etc.)
- 🆕 `post.comment.added` - When a comment is added to a post

**Page Events**
- ✅ `page.published` - When a page is published
- ✅ `page.unpublished` - When a page is unpublished
- ✅ `page.updated` - When a published page is updated
- ✅ `page.deleted` - When a page is deleted

#### Member Triggers

**Member Lifecycle**
- ✅ `member.created` - When a new member signs up
- ✅ `member.updated` - When member details are updated
- ✅ `member.deleted` - When a member is deleted
- 🆕 `member.subscribed` - When member subscribes to newsletter
- 🆕 `member.unsubscribed` - When member unsubscribes from newsletter
- 🆕 `member.login` - When member logs in

**Subscription Events**
- 🆕 `member.subscription.created` - When member starts paid subscription
- 🆕 `member.subscription.updated` - When subscription tier changes
- 🆕 `member.subscription.cancelled` - When subscription is cancelled
- 🆕 `member.subscription.renewed` - When subscription renews
- 🆕 `member.subscription.payment_failed` - When payment fails

**Member Engagement**
- 🆕 `member.email.opened` - When member opens an email
- 🆕 `member.email.clicked` - When member clicks link in email
- 🆕 `member.comment.posted` - When member posts a comment
- 🆕 `member.inactive` - When member hasn't engaged in X days

**Member Milestones**
- 🆕 `member.anniversary` - On membership anniversary
- 🆕 `member.milestone` - When site reaches member count milestone

#### Email & Newsletter Triggers

- 🆕 `newsletter.sent` - When newsletter is sent
- 🆕 `email.batch.completed` - When email batch completes
- 🆕 `email.batch.failed` - When email batch fails
- 🆕 `newsletter.milestone.opened` - When newsletter reaches open rate milestone
- 🆕 `newsletter.milestone.clicked` - When newsletter reaches click rate milestone

#### Tag & Taxonomy Triggers

- ✅ `tag.created` - When a tag is created
- ✅ `tag.updated` - When a tag is updated
- ✅ `tag.deleted` - When a tag is deleted

#### Comment & Engagement Triggers

- 🆕 `comment.created` - When a comment is posted
- 🆕 `comment.flagged` - When a comment is flagged for moderation
- 🆕 `comment.liked` - When a comment receives a like

#### System Triggers

- ✅ `site.changed` - When site settings change
- 🆕 `theme.changed` - When theme is changed
- 🆕 `user.created` - When staff user is created
- 🆕 `user.login` - When staff user logs in
- 🆕 `backup.completed` - When backup completes
- 🆕 `backup.failed` - When backup fails

### Schedule-Based Triggers

These triggers fire based on time schedules.

- 🆕 `schedule.cron` - Custom cron expression (e.g., "0 9 * * *" for 9 AM daily)
- 🆕 `schedule.interval` - Recurring interval (e.g., every 1 hour, every 1 day)
- 🆕 `schedule.once` - One-time scheduled execution

**Use Cases:**
- Daily digest emails
- Weekly member reports
- Monthly analytics summaries
- Periodic content backups
- Regular content republishing

### Webhook-Based Triggers

- 🆕 `webhook.received` - When external system sends webhook to Ghost
- 🆕 `form.submitted` - When custom form is submitted (future integration)

### Condition-Based Triggers

These fire when specific conditions are met.

- 🆕 `condition.member_count` - When member count reaches threshold
- 🆕 `condition.mrr` - When MRR reaches threshold
- 🆕 `condition.post_count` - When post count reaches threshold

---

## Automation Actions

### Ghost Internal Actions

#### Content Actions

**Post Management**
- 🆕 `create.post` - Create a new post
  - Inputs: title, content (HTML/Lexical), status, tags, authors, featured_image, etc.
- 🆕 `update.post` - Update existing post
  - Inputs: post_id, fields to update
- 🆕 `publish.post` - Publish a draft post
  - Inputs: post_id, publish_at (optional)
- 🆕 `unpublish.post` - Unpublish a post
  - Inputs: post_id
- 🆕 `delete.post` - Delete a post
  - Inputs: post_id
- 🆕 `duplicate.post` - Duplicate a post
  - Inputs: post_id, new_title (optional)
- 🆕 `add.post.tag` - Add tag to post
  - Inputs: post_id, tag_name or tag_id
- 🆕 `remove.post.tag` - Remove tag from post
  - Inputs: post_id, tag_id

**Page Management**
- 🆕 `create.page` - Create a new page
- 🆕 `update.page` - Update existing page
- 🆕 `publish.page` - Publish a page
- 🆕 `delete.page` - Delete a page

#### Member Actions

**Member Management**
- 🆕 `create.member` - Create a new member
  - Inputs: email, name, note, labels, subscribed
- 🆕 `update.member` - Update member details
  - Inputs: member_id, fields to update
- 🆕 `delete.member` - Delete a member
  - Inputs: member_id
- 🆕 `add.member.label` - Add label to member
  - Inputs: member_id, label_name
- 🆕 `remove.member.label` - Remove label from member
  - Inputs: member_id, label_name
- 🆕 `subscribe.member` - Subscribe member to newsletter
  - Inputs: member_id, newsletter_id (optional)
- 🆕 `unsubscribe.member` - Unsubscribe member from newsletter
  - Inputs: member_id, newsletter_id (optional)

**Member Communication**
- 🆕 `send.member.email` - Send email to specific member
  - Inputs: member_id, subject, html_content, from_name
- 🆕 `generate.member.signin_link` - Generate magic link for member
  - Inputs: member_id, redirect_url (optional)

**Subscription Management**
- 🆕 `create.member.subscription` - Create subscription for member
  - Inputs: member_id, tier_id, trial_days (optional)
- 🆕 `cancel.member.subscription` - Cancel member subscription
  - Inputs: member_id, subscription_id
- 🆕 `update.member.subscription` - Update subscription tier
  - Inputs: member_id, subscription_id, new_tier_id

#### Email & Newsletter Actions

- 🆕 `send.newsletter` - Send newsletter to subscribers
  - Inputs: post_id, newsletter_id, recipient_filter
- 🆕 `send.test.email` - Send test email
  - Inputs: post_id, recipient_emails
- 🆕 `send.bulk.email` - Send bulk email to members
  - Inputs: subject, html_content, member_filter, from_name

#### Tag & Taxonomy Actions

- 🆕 `create.tag` - Create a new tag
  - Inputs: name, slug, description, color
- 🆕 `update.tag` - Update tag
  - Inputs: tag_id, fields to update
- 🆕 `delete.tag` - Delete tag
  - Inputs: tag_id

#### Analytics & Reporting Actions

- 🆕 `generate.report` - Generate analytics report
  - Inputs: report_type (members, revenue, content), date_range, format (PDF, CSV)
- 🆕 `export.members` - Export members to CSV
  - Inputs: member_filter, fields_to_export
- 🆕 `export.posts` - Export posts to CSV
  - Inputs: post_filter, fields_to_export

#### System Actions

- 🆕 `create.backup` - Create database backup
- 🆕 `update.setting` - Update site setting
  - Inputs: setting_key, setting_value
- 🆕 `clear.cache` - Clear site cache
- 🆕 `log.event` - Log custom event for debugging
  - Inputs: message, level (info, warn, error), metadata

### External Actions

#### HTTP Actions

- 🆕 `http.request` - Make HTTP request to external API
  - Inputs: method (GET, POST, PUT, DELETE), url, headers, body, auth
  - Returns: Response data for use in subsequent steps

- 🆕 `http.webhook` - Send webhook to external URL
  - Inputs: url, method, payload, headers, secret (for HMAC)
  - Enhanced version of current webhook with better error handling

#### Integration Actions

**Slack**
- 🆕 `slack.send_message` - Send message to Slack channel
  - Inputs: channel, text, attachments
- 🆕 `slack.send_dm` - Send direct message
  - Inputs: user_id, text

**Email Services**
- 🆕 `sendgrid.send` - Send email via SendGrid
- 🆕 `mailchimp.add_subscriber` - Add subscriber to Mailchimp
- 🆕 `mailchimp.remove_subscriber` - Remove from Mailchimp
- 🆕 `mailchimp.update_subscriber` - Update subscriber data

**Social Media**
- 🆕 `twitter.post_tweet` - Post to Twitter/X
  - Inputs: text, media_urls
- 🆕 `linkedin.share_post` - Share to LinkedIn
- 🆕 `facebook.post` - Post to Facebook page

**Analytics & Tracking**
- 🆕 `google_analytics.track_event` - Send event to GA
- 🆕 `mixpanel.track` - Track event in Mixpanel
- 🆕 `segment.track` - Track event in Segment

**CRM & Marketing**
- 🆕 `hubspot.create_contact` - Create contact in HubSpot
- 🆕 `salesforce.create_lead` - Create lead in Salesforce
- 🆕 `intercom.create_user` - Create user in Intercom

**Stripe (Payment Processing)**
- 🆕 `stripe.create_customer` - Create Stripe customer
- 🆕 `stripe.create_checkout` - Create checkout session
- 🆕 `stripe.refund_payment` - Refund a payment

**Cloud Storage**
- 🆕 `s3.upload_file` - Upload file to AWS S3
- 🆕 `dropbox.upload_file` - Upload to Dropbox
- 🆕 `google_drive.create_file` - Create file in Google Drive

#### AI Actions

- 🆕 `openai.generate_text` - Generate text with GPT
  - Inputs: prompt, model, max_tokens, temperature
  - Use cases: Auto-generate social posts, summaries, SEO descriptions

- 🆕 `openai.generate_image` - Generate image with DALL-E
  - Inputs: prompt, size
  - Use cases: Auto-generate featured images

- 🆕 `openai.moderate_content` - Moderate content with OpenAI
  - Inputs: text
  - Use cases: Auto-moderate comments

---

## Automation Conditions

Conditions allow branching logic in workflows.

### Comparison Conditions

- 🆕 `equals` - Value equals
- 🆕 `not_equals` - Value does not equal
- 🆕 `contains` - String contains substring
- 🆕 `not_contains` - String does not contain substring
- 🆕 `starts_with` - String starts with
- 🆕 `ends_with` - String ends with
- 🆕 `greater_than` - Number/date greater than
- 🆕 `less_than` - Number/date less than
- 🆕 `greater_than_or_equal` - Number/date ≥
- 🆕 `less_than_or_equal` - Number/date ≤
- 🆕 `is_empty` - Value is empty/null
- 🆕 `is_not_empty` - Value is not empty/null
- 🆕 `matches_regex` - Matches regular expression

### Logical Conditions

- 🆕 `and` - All conditions must be true
- 🆕 `or` - Any condition must be true
- 🆕 `not` - Negate condition

### Member Conditions

- 🆕 `member.has_label` - Member has specific label
- 🆕 `member.is_paid` - Member has paid subscription
- 🆕 `member.is_free` - Member is free subscriber
- 🆕 `member.email_count` - Member email count comparison
- 🆕 `member.created_at` - Member created date comparison
- 🆕 `member.status` - Member status check

### Post Conditions

- 🆕 `post.has_tag` - Post has specific tag
- 🆕 `post.visibility` - Post visibility check (public/members/paid)
- 🆕 `post.featured` - Post is featured
- 🆕 `post.author` - Post author check
- 🆕 `post.word_count` - Word count comparison

### Time Conditions

- 🆕 `time.day_of_week` - Specific day of week
- 🆕 `time.hour_of_day` - Specific hour
- 🆕 `time.between` - Between two times

### Advanced Conditions

- 🆕 `javascript` - Custom JavaScript expression
  - Allows advanced custom logic
  - Sandboxed execution environment

---

## Data Transformation & Variables

### Variable System

Workflows can access data from triggers and previous steps using variables.

**Syntax:** `{{trigger.member.email}}`, `{{step1.response.id}}`

**Available Contexts:**
- `{{trigger.*}}` - Data from the trigger event
- `{{stepN.*}}` - Data from step N output
- `{{workflow.*}}` - Workflow metadata (id, name, run_count)
- `{{ghost.*}}` - Ghost site data (title, url, members_count)
- `{{current.*}}` - Current context (date, time, user)

**Examples:**
```
{{trigger.post.title}}
{{trigger.member.email}}
{{step1.http_response.user_id}}
{{ghost.site_title}}
{{current.date.iso}}
```

### Transformation Functions

- `{{trigger.member.name | uppercase}}` - Convert to uppercase
- `{{trigger.member.name | lowercase}}` - Convert to lowercase
- `{{trigger.post.published_at | date_format('YYYY-MM-DD')}}` - Format date
- `{{trigger.post.html | strip_html}}` - Strip HTML tags
- `{{trigger.post.html | truncate(100)}}` - Truncate text
- `{{trigger.member.email | hash_md5}}` - Hash value
- `{{trigger.post.tags | join(', ')}}` - Join array

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Goals:** Build core automation infrastructure

**Tasks:**
1. **Database Schema**
   - Create migrations for `workflows`, `workflow_runs`, `workflow_logs` tables
   - Add indexes for performance

2. **Models**
   - Implement Workflow, WorkflowRun, WorkflowLog models
   - Add relationships and validation

3. **Basic Service**
   - Create automation service structure
   - Implement workflow executor with basic step processing
   - Add event listener integration

4. **API Endpoints**
   - CRUD endpoints for workflows
   - Workflow run endpoints
   - Trigger/action listing endpoints

5. **Event Expansion**
   - Add missing event triggers to webhook system
   - Implement new events: subscription, email, comment events

**Deliverables:**
- Database schema and migrations
- Core automation models
- Basic API endpoints
- Event system enhancements

### Phase 2: Core Triggers & Actions (Weeks 5-8)

**Goals:** Implement essential triggers and actions

**Tasks:**
1. **Trigger Registry**
   - Implement trigger registry system
   - Add event-based triggers (post, page, member, tag)
   - Add schedule-based triggers (cron, interval)

2. **Action Registry**
   - Implement action registry system
   - Add core Ghost actions (create/update/delete posts, members)
   - Add email actions (send member email, newsletter)
   - Add HTTP actions (webhook, HTTP request)

3. **Condition System**
   - Implement condition evaluator
   - Add comparison conditions
   - Add logical operators (AND, OR, NOT)
   - Add member/post-specific conditions

4. **Variable System**
   - Implement variable parser and resolver
   - Add transformation functions
   - Support nested variable access

5. **Queue System**
   - Integrate Bull/BullMQ for job queue
   - Implement retry logic
   - Add rate limiting

**Deliverables:**
- Working trigger system with 20+ triggers
- Working action system with 30+ actions
- Condition evaluation engine
- Variable system with transformations
- Job queue integration

### Phase 3: Admin UI - Builder (Weeks 9-12)

**Goals:** Create visual workflow builder

**Tasks:**
1. **Project Setup**
   - Create new React app: `apps/admin-x-automations`
   - Set up build pipeline
   - Integrate with Ghost Admin

2. **Core Components**
   - WorkflowList component
   - WorkflowBuilder component
   - WorkflowCanvas (drag-and-drop)
   - TriggerSelector
   - ActionSelector
   - ConditionBuilder

3. **Visual Builder**
   - Implement drag-and-drop workflow canvas
   - Node-based workflow editor (similar to n8n)
   - Visual connection between steps
   - Step configuration panels

4. **Form Builders**
   - Dynamic form generation for trigger configs
   - Dynamic form generation for action configs
   - Variable picker/autocomplete
   - Condition builder UI

5. **Integration**
   - Add "Automations" menu item to Ghost Admin
   - Embed React app in Admin
   - API integration via admin-x-framework

**Deliverables:**
- Complete workflow builder UI
- Visual workflow canvas
- Integrated into Ghost Admin
- User-friendly workflow creation

### Phase 4: Testing & Analytics (Weeks 13-14)

**Goals:** Add testing, monitoring, and analytics

**Tasks:**
1. **Testing Features**
   - Test workflow execution
   - Step-by-step debugging
   - Mock data for testing
   - Dry-run mode

2. **Monitoring & Logging**
   - Workflow run history
   - Detailed step logs
   - Error tracking and notifications
   - Performance metrics

3. **Analytics Dashboard**
   - Workflow success/failure rates
   - Average execution time
   - Most used triggers/actions
   - Error rate trending

4. **Notifications**
   - Notify on workflow failures
   - Email alerts for errors
   - Slack/webhook notifications

**Deliverables:**
- Workflow testing interface
- Run history and logs UI
- Analytics dashboard
- Error notification system

### Phase 5: Advanced Features (Weeks 15-18)

**Goals:** Add advanced automation capabilities

**Tasks:**
1. **Advanced Triggers**
   - Webhook receiver for external systems
   - Condition-based triggers
   - Composite triggers (trigger on multiple events)

2. **Advanced Actions**
   - AI integrations (OpenAI)
   - Social media integrations
   - CRM integrations (HubSpot, Salesforce)
   - Cloud storage integrations

3. **Advanced Logic**
   - Loops (iterate over arrays)
   - Delays (wait X time before next step)
   - Parallel execution (run multiple actions simultaneously)
   - Sub-workflows (call another workflow)

4. **Templates & Library**
   - Pre-built workflow templates
   - Community workflow sharing
   - Import/export workflows
   - Workflow versioning

5. **Error Handling**
   - Try-catch blocks
   - Fallback actions on error
   - Retry strategies per action
   - Error branching

**Deliverables:**
- Advanced trigger types
- External service integrations
- Advanced workflow logic
- Workflow template library

### Phase 6: Performance & Security (Weeks 19-20)

**Goals:** Optimize performance and secure the system

**Tasks:**
1. **Performance Optimization**
   - Database query optimization
   - Caching strategies
   - Rate limiting per workflow
   - Resource usage limits

2. **Security Enhancements**
   - Input validation for all actions
   - Sandboxing for JavaScript conditions
   - Secrets management for API keys
   - Audit logging

3. **Reliability**
   - Dead letter queue for failed jobs
   - Automatic retry with exponential backoff
   - Circuit breaker pattern
   - Health checks

4. **Documentation**
   - User documentation
   - API documentation
   - Developer documentation
   - Tutorial videos

**Deliverables:**
- Optimized performance
- Security hardening
- Comprehensive documentation
- Production-ready system

### Phase 7: Migration & Launch (Weeks 21-22)

**Goals:** Migrate existing integrations and launch

**Tasks:**
1. **Zapier Migration**
   - Create equivalent workflows for common Zapier integrations
   - Provide migration guide
   - Update Zapier modal to suggest native automations

2. **Beta Testing**
   - Invite select users to beta test
   - Gather feedback
   - Fix bugs and improve UX

3. **Marketing & Launch**
   - Create announcement post
   - Update documentation
   - Create demo videos
   - Announce in Ghost newsletter

4. **Post-Launch Support**
   - Monitor for issues
   - Rapid bug fixes
   - User support

**Deliverables:**
- Migration tools
- Beta testing feedback
- Public launch
- Support infrastructure

---

## Technical Architecture Details

### Database Schema

```sql
-- Workflows table
CREATE TABLE workflows (
  id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused'
  trigger_type VARCHAR(50) NOT NULL,  -- 'event', 'schedule', 'webhook'
  trigger_config JSON NOT NULL,
  steps JSON NOT NULL,                -- Array of step definitions
  created_by VARCHAR(24) NOT NULL,
  last_run_at DATETIME,
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Workflow runs table
CREATE TABLE workflow_runs (
  id VARCHAR(24) PRIMARY KEY,
  workflow_id VARCHAR(24) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  trigger_data JSON,
  steps_completed INTEGER DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  error TEXT,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  INDEX idx_workflow_id (workflow_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Workflow logs table
CREATE TABLE workflow_logs (
  id VARCHAR(24) PRIMARY KEY,
  workflow_run_id VARCHAR(24) NOT NULL,
  step_index INTEGER NOT NULL,
  step_type VARCHAR(50) NOT NULL,      -- 'trigger', 'condition', 'action'
  step_name VARCHAR(191) NOT NULL,
  status VARCHAR(50) NOT NULL,          -- 'pending', 'running', 'completed', 'failed', 'skipped'
  input_data JSON,
  output_data JSON,
  error TEXT,
  duration_ms INTEGER,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (workflow_run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE,
  INDEX idx_workflow_run_id (workflow_run_id)
);

-- Workflow secrets table (for storing API keys securely)
CREATE TABLE workflow_secrets (
  id VARCHAR(24) PRIMARY KEY,
  workflow_id VARCHAR(24) NOT NULL,
  key_name VARCHAR(191) NOT NULL,
  encrypted_value TEXT NOT NULL,       -- Encrypted using Ghost's security service
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  UNIQUE KEY unique_workflow_key (workflow_id, key_name)
);
```

### Workflow JSON Structure

```json
{
  "id": "workflow_123",
  "name": "Welcome New Members",
  "description": "Send welcome email when member signs up",
  "status": "active",
  "trigger_type": "event",
  "trigger_config": {
    "event": "member.created"
  },
  "steps": [
    {
      "id": "step_1",
      "type": "condition",
      "name": "Check if paid member",
      "config": {
        "condition": "member.is_paid",
        "operator": "equals",
        "value": true
      },
      "on_true": "step_2",
      "on_false": "step_4"
    },
    {
      "id": "step_2",
      "type": "action",
      "name": "Send premium welcome email",
      "action": "send.member.email",
      "config": {
        "member_id": "{{trigger.member.id}}",
        "subject": "Welcome to {{ghost.site_title}} Premium!",
        "html_content": "<h1>Welcome {{trigger.member.name}}!</h1><p>Thanks for subscribing...</p>",
        "from_name": "Ghost Team"
      },
      "next": "step_3"
    },
    {
      "id": "step_3",
      "type": "action",
      "name": "Add 'premium-member' label",
      "action": "add.member.label",
      "config": {
        "member_id": "{{trigger.member.id}}",
        "label_name": "premium-member"
      },
      "next": null
    },
    {
      "id": "step_4",
      "type": "action",
      "name": "Send free welcome email",
      "action": "send.member.email",
      "config": {
        "member_id": "{{trigger.member.id}}",
        "subject": "Welcome to {{ghost.site_title}}!",
        "html_content": "<h1>Welcome!</h1>",
        "from_name": "Ghost Team"
      },
      "next": null
    }
  ]
}
```

### Service Architecture

**AutomationService** (`automation-service.js`)
```javascript
class AutomationService {
  constructor({models, webhooks, jobs, email}) {
    this.models = models;
    this.triggerRegistry = new TriggerRegistry();
    this.actionRegistry = new ActionRegistry();
    this.executor = new WorkflowExecutor({
      models,
      actionRegistry: this.actionRegistry,
      conditionEvaluator: new ConditionEvaluator()
    });
    this.queueManager = new QueueManager({jobs});
  }

  async init() {
    // Register all triggers
    await this.triggerRegistry.registerAllTriggers();

    // Register all actions
    await this.actionRegistry.registerAllActions();

    // Start listening to events
    await this.listen();

    // Start queue processor
    await this.queueManager.start();
  }

  async listen() {
    const activeWorkflows = await this.models.Workflow.findAll({
      filter: 'status:active+trigger_type:event'
    });

    // Group workflows by trigger event
    const workflowsByEvent = _.groupBy(
      activeWorkflows,
      w => w.get('trigger_config').event
    );

    // Register event listeners
    for (const [event, workflows] of Object.entries(workflowsByEvent)) {
      events.on(event, async (model, options) => {
        if (options?.importing) return;

        for (const workflow of workflows) {
          await this.queueManager.enqueueWorkflow(workflow.id, {
            trigger: event,
            data: model.toJSON()
          });
        }
      });
    }
  }

  async executeWorkflow(workflowId, triggerData) {
    return await this.executor.execute(workflowId, triggerData);
  }
}
```

**WorkflowExecutor** (`workflow-executor.js`)
```javascript
class WorkflowExecutor {
  constructor({models, actionRegistry, conditionEvaluator}) {
    this.models = models;
    this.actionRegistry = actionRegistry;
    this.conditionEvaluator = conditionEvaluator;
  }

  async execute(workflowId, triggerData) {
    const workflow = await this.models.Workflow.findOne({id: workflowId});

    // Create workflow run
    const run = await this.models.WorkflowRun.add({
      workflow_id: workflowId,
      status: 'running',
      trigger_data: triggerData,
      started_at: new Date()
    });

    const context = {
      trigger: triggerData,
      workflow: workflow.toJSON(),
      stepOutputs: {}
    };

    try {
      const steps = workflow.get('steps');
      let currentStepId = steps[0].id;
      let stepIndex = 0;

      while (currentStepId) {
        const step = steps.find(s => s.id === currentStepId);
        const result = await this.executeStep(run.id, step, context, stepIndex);

        context.stepOutputs[step.id] = result.output;
        stepIndex++;

        await this.models.WorkflowRun.edit({
          steps_completed: stepIndex
        }, {id: run.id});

        // Determine next step
        if (step.type === 'condition') {
          currentStepId = result.conditionResult ? step.on_true : step.on_false;
        } else {
          currentStepId = step.next;
        }
      }

      // Mark as completed
      await this.models.WorkflowRun.edit({
        status: 'completed',
        completed_at: new Date()
      }, {id: run.id});

      await this.models.Workflow.edit({
        last_run_at: new Date(),
        run_count: workflow.get('run_count') + 1
      }, {id: workflowId});

      return {success: true, runId: run.id};

    } catch (error) {
      await this.models.WorkflowRun.edit({
        status: 'failed',
        error: error.message,
        completed_at: new Date()
      }, {id: run.id});

      await this.models.Workflow.edit({
        error_count: workflow.get('error_count') + 1
      }, {id: workflowId});

      throw error;
    }
  }

  async executeStep(runId, step, context, stepIndex) {
    const log = await this.models.WorkflowLog.add({
      workflow_run_id: runId,
      step_index: stepIndex,
      step_type: step.type,
      step_name: step.name,
      status: 'running',
      input_data: step.config
    });

    const startTime = Date.now();

    try {
      let result;

      if (step.type === 'action') {
        const action = this.actionRegistry.get(step.action);
        const resolvedConfig = this.resolveVariables(step.config, context);
        result = await action.execute(resolvedConfig);
      } else if (step.type === 'condition') {
        result = await this.conditionEvaluator.evaluate(step.config, context);
      }

      const duration = Date.now() - startTime;

      await this.models.WorkflowLog.edit({
        status: 'completed',
        output_data: result,
        duration_ms: duration
      }, {id: log.id});

      return {
        output: result,
        conditionResult: step.type === 'condition' ? result : null
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      await this.models.WorkflowLog.edit({
        status: 'failed',
        error: error.message,
        duration_ms: duration
      }, {id: log.id});

      throw error;
    }
  }

  resolveVariables(config, context) {
    // Recursively resolve {{variable}} placeholders
    const resolved = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        resolved[key] = this.replaceVariables(value, context);
      } else if (typeof value === 'object') {
        resolved[key] = this.resolveVariables(value, context);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  replaceVariables(str, context) {
    // Replace {{trigger.member.email}} style variables
    return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      return _.get(context, path, match);
    });
  }
}
```

### Queue Management

Use **BullMQ** for job queue management:

```javascript
const {Queue, Worker} = require('bullmq');

class QueueManager {
  constructor({jobs}) {
    this.queue = new Queue('automations', {
      connection: jobs.connection // Redis connection
    });
  }

  async enqueueWorkflow(workflowId, triggerData, options = {}) {
    return await this.queue.add('execute-workflow', {
      workflowId,
      triggerData
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      ...options
    });
  }

  async start() {
    this.worker = new Worker('automations', async job => {
      const {workflowId, triggerData} = job.data;
      return await automationService.executeWorkflow(workflowId, triggerData);
    }, {
      connection: this.queue.connection,
      concurrency: 10
    });

    this.worker.on('failed', (job, err) => {
      logging.error('Workflow execution failed', {
        jobId: job.id,
        workflowId: job.data.workflowId,
        error: err.message
      });
    });
  }
}
```

---

## UI/UX Design Considerations

### Workflow Builder Interface

**Design Principles:**
1. **Visual First:** Node-based canvas like n8n/Zapier
2. **Beginner-Friendly:** Pre-built templates for common use cases
3. **Power User Support:** Advanced mode with JavaScript conditions
4. **Real-time Feedback:** Test workflows before activation
5. **Clear Error Handling:** Helpful error messages and suggestions

**Key UI Components:**

1. **Workflow List Page**
   - Table view of all workflows
   - Filter by status (active, paused, draft)
   - Search by name
   - Quick actions (activate, pause, delete, duplicate)
   - Analytics summary (run count, error rate)

2. **Workflow Builder Canvas**
   - Drag-and-drop nodes
   - Visual connections between steps
   - Zoom in/out
   - Auto-layout
   - Minimap for large workflows

3. **Step Configuration Panel**
   - Right sidebar
   - Dynamic form based on step type
   - Variable picker with autocomplete
   - Test/preview button
   - Validation feedback

4. **Template Gallery**
   - Pre-built workflow templates
   - Categories (Member, Content, Email, Analytics)
   - Preview and install
   - Community templates

5. **Run History**
   - List of recent runs
   - Filter by status
   - View detailed logs
   - Retry failed runs

6. **Analytics Dashboard**
   - Success/failure rates
   - Average execution time
   - Most used triggers/actions
   - Error trending

### Mobile Considerations

- Workflow list should be mobile-responsive
- Workflow builder optimized for desktop (complex drag-and-drop)
- Run history and analytics mobile-friendly
- Push notifications for workflow failures (future)

---

## Security & Privacy Considerations

### Security Measures

1. **Input Validation**
   - Validate all action inputs
   - Sanitize HTML content
   - Prevent SQL injection
   - Rate limiting per workflow

2. **Secrets Management**
   - Store API keys encrypted
   - Never log secrets
   - Secrets scoped to workflows
   - Rotate secrets regularly

3. **Sandboxing**
   - JavaScript conditions run in VM2 sandbox
   - Limited execution time
   - No access to file system
   - No network access from sandbox

4. **Permissions**
   - Owner/Admin can create workflows
   - Editor can view workflows
   - Audit log for workflow changes
   - Workflow runs execute with creator's permissions

5. **External Requests**
   - Allowlist domains for HTTP requests
   - SSL/TLS required
   - Request timeout limits
   - Response size limits

### Privacy Considerations

1. **Data Handling**
   - Workflow logs stored for 30 days
   - Option to disable detailed logging
   - Comply with GDPR for member data
   - Clear data retention policies

2. **External Services**
   - Warn when sending data to external services
   - Show data being sent
   - Option to anonymize data
   - User consent for external integrations

---

## Performance Considerations

### Optimization Strategies

1. **Queue-Based Execution**
   - Async execution via BullMQ
   - Prevents blocking main thread
   - Handles high-volume events

2. **Rate Limiting**
   - Per-workflow rate limits
   - Global rate limits
   - Prevent abuse
   - Fair resource allocation

3. **Caching**
   - Cache workflow definitions
   - Cache trigger/action registries
   - Invalidate on updates

4. **Database Optimization**
   - Indexes on frequently queried fields
   - Archive old workflow runs
   - Batch operations where possible

5. **Resource Limits**
   - Max workflow execution time (5 minutes)
   - Max steps per workflow (50)
   - Max concurrent runs per workflow (10)
   - Max payload size (1MB)

### Monitoring

- Track execution times
- Alert on failures
- Monitor queue depth
- Resource usage metrics

---

## Compatibility & Migration

### Zapier Integration Strategy

**Short Term:**
- Keep Zapier integration as-is
- Add link to native automations in Zapier modal
- Provide migration guide

**Medium Term:**
- Create workflow templates matching popular Zaps
- Auto-suggest native alternatives
- One-click migration tool (future)

**Long Term:**
- Native automations become primary
- Zapier for services Ghost doesn't support
- Partner with Zapier for advanced integrations

### n8n/Make Compatibility

- Provide workflow export format compatible with n8n
- Allow importing n8n workflows (future)
- Document migration path

---

## Success Metrics

### Key Performance Indicators

1. **Adoption Metrics**
   - % of sites with active workflows
   - Average workflows per site
   - Growth in automation usage

2. **Usage Metrics**
   - Total workflow executions per day
   - Most popular triggers
   - Most popular actions
   - Template usage

3. **Quality Metrics**
   - Workflow success rate
   - Average error rate
   - Time to fix errors
   - User satisfaction (NPS)

4. **Business Metrics**
   - Reduction in Zapier usage
   - Support ticket reduction
   - Pro plan upgrades (if gated feature)

---

## Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation | High | Medium | Queue system, rate limiting, monitoring |
| Queue system complexity | Medium | Medium | Use proven library (BullMQ), thorough testing |
| Database growth from logs | Medium | High | Auto-archive, retention policies |
| Security vulnerabilities | High | Low | Input validation, sandboxing, security audit |
| External API failures | Medium | High | Retry logic, error handling, circuit breaker |

### Product Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low adoption | High | Medium | Templates, documentation, tutorials |
| Feature complexity | Medium | High | Progressive disclosure, beginner mode |
| Zapier conflicts | Low | Low | Clear positioning, complementary use |
| Support burden | Medium | Medium | Good docs, error messages, self-service tools |

---

## Future Enhancements

### Phase 8+ (Future)

1. **Advanced Features**
   - Workflow marketplace
   - Version control for workflows
   - A/B testing workflows
   - Multi-site workflows (for Ghost(Pro) networks)
   - Workflow analytics AI (suggest optimizations)

2. **AI-Powered Automation**
   - Natural language workflow creation ("Send welcome email to new members")
   - Auto-suggest workflows based on site behavior
   - Smart error recovery
   - Content generation workflows

3. **Mobile App**
   - iOS/Android app to monitor workflows
   - Push notifications for failures
   - Quick workflow activation/deactivation

4. **Developer Features**
   - Custom action SDK
   - Custom trigger SDK
   - Plugin marketplace for community actions
   - GraphQL API for workflows

5. **Enterprise Features**
   - Team collaboration on workflows
   - Approval workflows
   - Compliance logging
   - SSO integration

---

## Conclusion

Building a native automation platform into Ghost represents a significant enhancement that will:

1. **Empower Users:** Give Ghost site owners powerful automation tools without requiring technical expertise or third-party services

2. **Improve Integration:** Provide tighter integration with Ghost's internal systems than webhooks allow

3. **Drive Growth:** Position Ghost as a more complete platform, reducing dependency on external tools

4. **Increase Value:** Add significant value to Ghost Pro subscriptions

5. **Build Community:** Enable a community of workflow creators and template sharers

**Next Steps:**
1. Review and approve this plan
2. Set up project tracking (GitHub project board)
3. Begin Phase 1 implementation
4. Regular progress reviews

The automation platform will transform Ghost from a publishing platform into a comprehensive content and membership automation engine, enabling creators to build sophisticated workflows without code.

---

## Appendix: Example Workflows

### Example 1: Welcome Email for New Members

**Trigger:** Member Created
**Actions:**
1. Wait 5 minutes
2. Send welcome email with onboarding tips
3. Add "new-member" label
4. Post to Slack: "New member: {{member.email}}"

### Example 2: Auto-Publish Weekly Roundup

**Trigger:** Schedule (Every Friday 9 AM)
**Actions:**
1. Get top 5 posts from last week (by views)
2. Generate roundup post using AI
3. Create draft post
4. Send notification to editor

### Example 3: Re-engage Inactive Members

**Trigger:** Schedule (Daily)
**Actions:**
1. Find members who haven't opened email in 30 days
2. For each member:
   - Send re-engagement email
   - Add "inactive" label
3. Log count to analytics

### Example 4: Cross-Post to Social Media

**Trigger:** Post Published
**Conditions:**
- Post has tag "social"
- Post is public

**Actions:**
1. Generate social media summary (AI)
2. Post to Twitter
3. Post to LinkedIn
4. Log to analytics

### Example 5: Failed Payment Recovery

**Trigger:** Payment Failed
**Actions:**
1. Send payment failure email
2. Wait 3 days
3. Check if still failed
4. Send reminder email
5. Wait 4 days
6. Send final notice
7. Add "payment-failed" label

---

**Document Version:** 1.0
**Last Updated:** 2025-10-21
**Author:** Claude AI Assistant
**Status:** Proposal / Planning
