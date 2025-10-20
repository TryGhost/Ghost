---
description: Add a new ShadCN/UI component to Shade with Storybook stories
args:
  component-name:
    description: The name of the ShadCN component to add (e.g., 'button', 'dialog', 'select')
    required: true
  skip-tests:
    description: Skip running the test suite (useful for faster iterations)
    required: false
---

# Add ShadCN Component to Shade

You are tasked with adding a new ShadCN/UI component to the Shade design system. Follow these steps carefully:

## Important Guidelines

**ALWAYS read and follow the instructions in `AGENTS.md`** - this file contains critical information about:
- Component structure and naming conventions
- Build and test commands
- Coding style requirements
- ShadCN installation guardrails
- Storybook documentation standards

## Step 1: Check if Component Already Exists

First, check if the component already exists in Shade:

1. Search for the component file in `src/components/ui/{{component-name}}.tsx`
2. Search for similar named files (e.g., for "input-otp" check for "input-otp.tsx", "otp.tsx", etc.)
3. If the component exists, **STOP** and inform the user that the component already exists and provide the file path

## Step 2: Fetch ShadCN Documentation

Use Puppeteer to retrieve the component documentation (if Puppeteer is not available use Webfetch):

1. Fetch
`https://ui.shadcn.com/docs/components/{{component-name}}`
2. Extract:
    - Component description and use case
    - Installation command (npx shadcn@latest add ...)
    - All code examples with full code blocks
    - Component variants (default, outline, ghost, etc.)
    - Size options (sm, md, lg, icon, etc.)
    - Props and TypeScript types
    - Usage patterns and best practices
3. Use this information to create comprehensive Storybook
stories

## Step 3: Install the Component

1. **Create a git branch first** (safety measure):
   ```bash
   git checkout -b shadcn-add-{{component-name}}
   ```

2. Run the installation command from the ShadCN docs:
   ```bash
   npx shadcn@latest add {{component-name}}
   ```

3. **CRITICAL**: When prompted about overwriting existing files, always choose **"No"** or **"Skip"**
   - NEVER overwrite existing Shade components
   - If conflicts occur, stop and inform the user

4. After installation, run:
   ```bash
   yarn && yarn lint --fix
   ```

5. **Fix linter errors in component file:**
   ```bash
   npx eslint --fix src/components/ui/{{component-name}}.tsx
   ```
   This ensures proper CSS classname order and prop ordering.

6. Fix any remaining linter errors manually

## Step 4: Verify Component Installation

1. Check that the component file was created: `src/components/ui/{{component-name}}.tsx`
2. Verify it follows Shade conventions:
   - Uses kebab-case for filename
   - Exports component with PascalCase name
   - Forwards and merges `className` with `cn(...)`
   - Includes proper TypeScript types

## Step 5: Create Storybook Stories

Create a new file `src/components/ui/{{component-name}}.stories.tsx` with:

### Story Structure

```typescript
import type {Meta, StoryObj} from '@storybook/react-vite';
import {ComponentName} from './{{component-name}}';

const meta = {
    title: 'Components / ComponentName',
    component: ComponentName,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: '[Brief description from ShadCN docs]'
            }
        }
    }
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof ComponentName>;
```

### Convert ShadCN Examples to Stories

For **each example** from the ShadCN documentation page:

1. Create a story that demonstrates that example
2. Name the story descriptively (e.g., `Default`, `WithIcon`, `Destructive`, `Small`, `Disabled`)
3. Add a `parameters.docs.description.story` explaining when to use this variant
4. Keep stories minimal and focused on demonstrating the component's capabilities

Example story with args:
```typescript
export const Default: Story = {
    name: 'Default',
    args: {
        children: 'Example content'
    },
    parameters: {
        docs: {
            description: {
                story: 'Main use case: [explain when to use this variant].'
            }
        }
    }
};
```

Example story with render function (use when composition is needed):
```typescript
export const WithLabel: Story = {
    render: () => (
        <div className="flex items-center gap-3">
            <ComponentName id="example" />
            <Label htmlFor="example">Label text</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Component with a label for better accessibility.'
            },
            source: {
                code: `<div className="flex items-center gap-3">
  <ComponentName id="example" />
  <Label htmlFor="example">Label text</Label>
</div>`
            }
        }
    }
};
```

**IMPORTANT**: When using `render` functions, ALWAYS include `parameters.docs.source.code` to show clean, copyable JSX instead of the entire story object. The source code should match the JSX in the render function but with proper 2-space indentation.

### Story Categories to Include

Based on the ShadCN examples, create stories for:
- **Default/Primary**: The main use case
- **Variants**: All visual variants (outline, ghost, destructive, etc.)
- **Sizes**: All size options (sm, lg, icon, etc.)
- **States**: Disabled, loading, error states
- **Compositions**: Complex examples showing multiple parts working together

## Step 6: Lint and Fix Stories

After creating the stories:

1. Run linting:
   ```bash
   yarn lint --fix
   ```

2. **Fix linter errors in story file:**
   ```bash
   npx eslint --fix src/components/ui/{{component-name}}.stories.tsx
   ```
   This ensures proper CSS classname order, prop ordering, and import organization.

3. Fix any remaining errors manually:
   - Import organization
   - Unused variables
   - TypeScript type errors
   - Tailwind class order

## Step 7: Export Component

Add the new component to `src/index.ts`:

```typescript
export * from './components/ui/{{component-name}}';
```

Run `yarn lint --fix` again to ensure proper import sorting.

## Step 8: Run Tests

**If `skip-tests` parameter is NOT set:**

Run the full test suite to ensure no regressions:

```bash
yarn test
```

Fix any test failures before proceeding.

**If `skip-tests` parameter IS set:**

Skip the test suite and proceed to visual verification. Note: Make sure to run tests before creating a PR.

## Step 9: Visual Verification with Puppeteer

Use Puppeteer to verify the component renders correctly in Storybook:

1. **Start Storybook in background:**
    Check if Storybook is running already on port 6006 and if not run:
   ```bash
   yarn storybook
   ```
   Wait for it to be ready (usually runs on http://localhost:6006)

2. **Launch Puppeteer and test each story:**
   - Launch browser with `puppeteer_launch` (headless: false recommended for debugging)
   - Create new page with `puppeteer_new_page`
   - For each story created, navigate to:
     `http://localhost:6006/iframe.html?id=components-{{component-name}}--{story-name}`
   - Wait for the story to render using `puppeteer_wait_for_selector` (e.g., wait for main component)
   - Capture console errors using `puppeteer_evaluate`:
     ```javascript
     window.__errors = window.__errors || [];
     window.addEventListener('error', (e) => window.__errors.push(e.message));
     ```
   - Take screenshot with `puppeteer_screenshot` for visual reference
   - Check for errors: `puppeteer_evaluate` with `return window.__errors || []`

3. **Report findings:**
   - If console errors found: Report them with story names and suggest fixes
   - If visual issues detected: Show screenshots
   - If everything looks good: Confirm with "All stories render without errors" + screenshot evidence

4. **Cleanup:**
   - Close Puppeteer browser with `puppeteer_close_browser`
   - Stop the Storybook process

### What to verify:
- ✅ Component renders without React errors
- ✅ No console errors or warnings
- ✅ All variants display correctly
- ✅ Typography and spacing look correct
- ✅ No layout issues or overlapping elements

## Step 10: Summary Report

Provide a summary to the user showing:
- Success message
- Files created/modified (component, stories, index.ts)
- List of all story names created
- Visual verification results:
  - Number of stories tested
  - Screenshots of key variants
  - Any errors or warnings found (or "No issues detected")
- Next steps: review in Storybook manually, commit changes on branch, create PR

## Error Handling

If any step fails:
1. Provide clear error message
2. Suggest solutions based on AGENTS.md
3. Don't proceed to next steps until issue is resolved
4. Offer to help debug the issue

## Important Notes

- Always maintain the existing Shade code style
- Follow the Storybook patterns from existing `.stories.tsx` files
- Use lucide-react for icons in stories (as shown in button.stories.tsx)
- Keep story descriptions concise and practical
- Focus on "when to use" rather than "what it is"
- Always run linting after making changes
- **For stories with `render` functions**: Always add `parameters.docs.source.code` with the clean JSX to make code examples copyable in Storybook
