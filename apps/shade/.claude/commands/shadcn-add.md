---
description: Add a new ShadCN/UI component to Shade with Storybook stories
args:
  component-name:
    description: The name of the ShadCN component to add (e.g., 'button', 'dialog', 'select')
    required: true
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

Use Puppeteer to visit the ShadCN documentation page:

1. Launch Puppeteer browser
2. Navigate to `https://ui.shadcn.com/docs/components/{{component-name}}`
3. Wait for the page to load completely
4. Extract the following information:
   - Component description and use case
   - Installation instructions (look for `npx shadcn@latest add` command)
   - All code examples shown on the page
   - Component variants and props
   - Usage patterns
5. Take a screenshot if needed for reference
6. Close the browser

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

Example story:
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

## Step 8: Verify Everything Works

1. Run the full test suite:
   ```bash
   yarn test
   ```

2. Start Storybook and verify stories render correctly:
   ```bash
   yarn storybook
   ```

3. Check that all examples from ShadCN docs are represented

## Step 9: Summary Report

Provide a summary to the user showing:
- Success message
- Files created/modified (component, stories, index.ts)
- List of all story names created
- Next steps: review in Storybook, run tests, commit changes on the branch, create PR

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
