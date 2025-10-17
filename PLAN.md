# Implementation Guide: Adding `podcast_url` Field to Ghost Posts

This guide provides step-by-step instructions for adding a new `podcast_url` field to Ghost posts, enabling integration with podcast providers.

## Overview

The `podcast_url` field will be:
- Added to the posts database table
- Returned via the Content and Admin APIs
- Editable in the Post Settings Menu
- Accessible in themes via `{{@post.podcast_url}}`

## Implementation Steps

### Step 1: Create Database Migration

Create a new migration file to add the `podcast_url` column to the posts table.

**Location:** `ghost/core/core/server/data/migrations/versions/5.x.x/`

**File name:** Use timestamp format, e.g., `2025-01-17-10-30-add-podcast-url-to-posts.js`

**Content:**
```javascript
const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'podcast_url', {
    type: 'text',
    maxlength: 2000,
    nullable: true
});
```

### Step 2: Update Database Schema

Add the `podcast_url` field definition to the posts table schema.

**File:** `ghost/core/core/server/data/schema/schema.js`

**Location in file:** Around line 104, after `canonical_url`

**Add:**
```javascript
canonical_url: {type: 'text', maxlength: 2000, nullable: true},
podcast_url: {type: 'text', maxlength: 2000, nullable: true},  // Add this line
custom_template: {type: 'string', maxlength: 100, nullable: true},
```

### Step 3: Configure URL Transformations in Post Model

Ghost transforms URLs between relative (`__GHOST_URL__`) and absolute formats. Add `podcast_url` to both transformation methods.

**File:** `ghost/core/core/server/models/post.js`

#### 3.1 Update `parse()` method
**Location:** Around line 169, in the URL fields array

**Add `podcast_url` to the array:**
```javascript
[
    'html',
    'plaintext',
    'canonical_url',
    'podcast_url',  // Add this
    'feature_image',
    'og_image',
    'twitter_image',
    'codeinjection_head',
    'codeinjection_foot'
]
```

#### 3.2 Update `formatOnWrite()` method
**Location:** Around line 234, in the formatting object

**Add:**
```javascript
canonical_url: 'toTransformReady',
podcast_url: 'toTransformReady',  // Add this
feature_image: 'toTransformReady',
```

### Step 4: Add Admin UI Components

#### 4.1 Update Post Settings Menu Template

**File:** `ghost/admin/app/components/gh-post-settings-menu.hbs`

**Location:** Around line 652, after the canonical URL field

**Add:**
```handlebars
{{!-- Podcast URL --}}
<div class="form-group">
    <label for="podcast-url">Podcast URL</label>
    <input
        type="url"
        id="podcast-url"
        name="post-setting-podcast-url"
        class="post-setting-podcast-url"
        value={{this.post.podcastUrl}}
        placeholder="https://example.com/podcast/episode-123"
        {{on "blur" this.setPodcastUrl}}
        data-test-field="podcast-url"
    />
</div>
```

#### 4.2 Add Event Handler in Component

**File:** `ghost/admin/app/components/gh-post-settings-menu.js`

**Location:** Around line 424, after the `setCanonicalUrl` action

**Add:**
```javascript
@action
setPodcastUrl(event) {
    this.post.podcastUrl = event.target.value;

    // Clear any existing errors
    this.post.errors.remove('podcastUrl');

    // Save the post with the new URL
    if (this.post.errors.has('podcastUrl')) {
        this.post.rollbackProperty('podcastUrl');
    } else {
        this.post.save();
    }
}
```

### Step 5: Deploy Changes

1. **Run the migration:**
   ```bash
   cd ghost/core
   yarn knex-migrator migrate
   ```

2. **Restart Ghost:**
   ```bash
   yarn dev
   ```

3. **Verify the field appears in:**
   - Post Settings Menu in Ghost Admin
   - API responses (check `/ghost/api/content/v5/posts/`)

## Usage in Themes

Once implemented, the `podcast_url` field is automatically available in theme templates:

```handlebars
{{!-- Basic usage --}}
{{#if @post.podcast_url}}
    <a href="{{@post.podcast_url}}" class="podcast-link">
        Listen to Podcast Episode
    </a>
{{/if}}

{{!-- With icon and styling --}}
{{#if @post.podcast_url}}
    <div class="podcast-player">
        <a href="{{@post.podcast_url}}" target="_blank" rel="noopener">
            <svg class="podcast-icon" width="24" height="24">
                <!-- Podcast icon SVG -->
            </svg>
            Listen on Your Favorite Podcast Platform
        </a>
    </div>
{{/if}}
```

## API Access

The field is automatically included in both APIs:

### Content API Response
```json
{
  "posts": [{
    "id": "...",
    "title": "...",
    "podcast_url": "https://example.com/podcast/episode-123",
    // ... other fields
  }]
}
```

### Admin API
- **GET:** Returns `podcast_url` with other post fields
- **PUT/POST:** Accepts `podcast_url` in the request body for updates

## Technical Architecture Notes

### Data Flow
1. **Database** → Column in `posts` table
2. **Model** → Bookshelf ORM automatically maps the column
3. **API Serialization** → Field is automatically included (not in the clean function's delete list)
4. **Frontend** → Available via `{{@post.podcast_url}}` in templates

### URL Transformation
- Ghost uses `__GHOST_URL__` as a placeholder for relative URLs in the database
- The `parse()` method converts to absolute URLs when reading
- The `formatOnWrite()` method converts to relative URLs when saving
- This ensures URLs work correctly across different Ghost installations

### No Additional Configuration Required
- The field automatically flows through Ghost's data pipeline
- No need to update API serializers or mappers
- No need to configure theme data availability
- The field is not in the Content API's clean function delete list

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Field appears in Post Settings Menu
- [ ] Can save and update podcast URL
- [ ] URL appears in Content API response
- [ ] URL appears in Admin API response
- [ ] URL is accessible in theme via `{{@post.podcast_url}}`
- [ ] URL transformations work (relative/absolute)
- [ ] Existing posts without podcast_url still work

## Rollback

To remove the field if needed:

1. Create a migration using `createDropColumnMigration`:
   ```javascript
   const {createDropColumnMigration} = require('../../utils');
   module.exports = createDropColumnMigration('posts', 'podcast_url');
   ```

2. Remove the field from:
   - `schema.js`
   - `post.js` model (both methods)
   - Admin UI components

3. Run migration and restart Ghost

## References

- **Schema Definition:** `/ghost/core/core/server/data/schema/schema.js:104`
- **Migration Utils:** `/ghost/core/core/server/data/migrations/utils/schema.js`
- **Post Model:** `/ghost/core/core/server/models/post.js:169,234`
- **Admin Template:** `/ghost/admin/app/components/gh-post-settings-menu.hbs:652`
- **Admin Component:** `/ghost/admin/app/components/gh-post-settings-menu.js:424`
- **API Mappers:** `/ghost/core/core/server/api/endpoints/utils/serializers/output/mappers/posts.js`