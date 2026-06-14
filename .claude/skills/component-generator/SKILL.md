---
name: component-generator
description: Scaffold new Radix-based UI components with CVA variants for the NutriTrack project. Use this whenever creating new UI components, adding variants to existing components, or setting up component test files. Essential for maintaining consistent component patterns across the codebase.
disable-model-invocation: true
---

# Component Generator

Scaffolds new UI components following the NutriTrack project's Radix UI + shadcn pattern. Creates complete component files with CVA variants, Tailwind styling, and test templates.

## When to Use

Trigger this skill when:
- Creating a new UI component (button, dialog, form input, etc.)
- Adding a component that needs multiple variants (size, color, style)
- Setting up component test files with proper helpers
- Ensuring new components follow project conventions

## Workflow

1. **Gather requirements** — Ask the user for:
   - Component name (PascalCase)
   - Radix primitive to base on (Dialog, Select, Checkbox, etc.)
   - Variants needed (size, color, style options)
   - Any specific behavior or accessibility needs

2. **Check existing patterns** — Read similar components in `src/components/ui/` to match patterns

3. **Generate component file** — Create `src/components/ui/<ComponentName>.jsx` with:
   - Radix primitive import
   - CVA variants configuration
   - Forward ref support
   - Proper PropTypes/TypeScript patterns
   - `cn()` utility for conditional classes

4. **Generate test file** — Create `src/components/ui/<ComponentName>.test.jsx` with:
   - React Testing Library setup
   - `renderWithProviders` helper usage
   - Basic render tests
   - Variant tests
   - Interaction tests (if applicable)

5. **Add index export** — Update `src/components/ui/index.js` if needed

## Component File Structure

```jsx
// src/components/ui/<ComponentName>.jsx
import { forwardRef } from 'react'
import { <RadixPrimitive> } from '@radix-ui/<primitive>'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const componentNameVariants = cva(
  // Base classes - always applied
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "default-variant-classes",
        outline: "outline-variant-classes",
        // Add more variants as needed
      },
      size: {
        default: "default-size-classes",
        sm: "small-size-classes",
        lg: "large-size-classes",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export const ComponentName = forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <RadixPrimitive
      ref={ref}
      className={cn(componentNameVariants({ variant, size }), className)}
      {...props}
    />
  )
})

ComponentName.displayName = 'ComponentName'
```

## Test File Structure

```jsx
// src/components/ui/<ComponentName>.test.jsx
import { renderWithProviders } from '@/test/renderWithProviders'
import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ComponentName } from './<ComponentName>'

describe('<ComponentName>', () => {
  it('renders with default props', () => {
    renderWithProviders(<ComponentName>Test</ComponentName>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('applies variant classes correctly', () => {
    // Test variant logic
  })

  it('applies size classes correctly', () => {
    // Test size logic
  })

  it('merges custom className', () => {
    // Test className merging
  })
})
```

## Project-Specific Patterns

**Styling:**
- Use `cn()` from `@/lib/utils` for conditional classes
- Follow Tailwind v4 patterns (theme in `@theme {}`, no tailwind.config)
- Mobile-first responsive design
- Touch-friendly min 44×44px for tablet use

**Testing:**
- Always use `renderWithProviders` from `@/test/renderWithProviders`
- For hooks: use `queryWrapper` from `@/test/queryWrapper`
- Mock Supabase with `supabaseMock` from `@/test/supabaseMock`

**Accessibility:**
- Radix primitives handle most ARIA attributes
- Add `aria-label` for icon-only buttons
- Ensure keyboard navigation works
- Test with screen reader in mind

## Reference Components

Check these for patterns:
- `src/components/ui/dialog.jsx` — Dialog pattern with Portal
- `src/components/ui/button.jsx` — CVA variants example
- `src/components/ui/select.jsx` — Form select pattern

## Language Rules

**UI text (user-facing):** Indonesian
- Example: "Simpan", "Batal", "Konfirmasi"

**Props and code:** English
- Example: `onSave`, `isLoading`, `errorMessage`

## Output Checklist

After generating, verify:
- [ ] Component exports properly
- [ ] Variants work as expected
- [ ] Forward ref passes through
- [ ] Test file uses correct helpers
- [ ] No console errors
- [ ] Follows AGENTS.md conventions
