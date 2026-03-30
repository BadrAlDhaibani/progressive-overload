# Design Tokens & UI Patterns

## Color Palette

```ts
export const colors = {
  // Backgrounds
  bg: '#ffffff',
  bgCard: '#f9fafb',
  bgMuted: '#f3f4f6',

  // Rose accent
  primary: '#f43f5e',
  primaryLight: '#ffe4e6',
  primaryMedium: '#fb7185',
  primaryDark: '#e11d48',

  // Text
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Borders & dividers
  border: '#e5e7eb',
  divider: '#f3f4f6',

  // Semantic
  success: '#22c55e',
  error: '#ef4444',
} as const;
```

## Typography

Use system font stack (`System` on iOS, `Roboto` on Android). No custom fonts needed.

- **Weight/rep numbers in set rows:** fontSize 20, fontWeight '700' (bold, scannable at a glance)
- **Section headers:** fontSize 16, fontWeight '600'
- **Body text:** fontSize 15, fontWeight '400'
- **Secondary/muted text:** fontSize 13, color textSecondary

## Spacing

Use a 4px base grid. Common values: 4, 8, 12, 16, 20, 24, 32.

- Card padding: 16
- List item vertical padding: 12
- Section gap: 24
- Screen horizontal padding: 16

## Touch Targets

Minimum 48×48px for all interactive elements. Set completion buttons should be at least 56×56px since they're used mid-workout.

## Component Patterns

### Set Row
The most-used component. A horizontal row with:
```
[Set #]  [Weight input]  [Reps input]  [✓ Complete button]
```
- Weight and reps inputs: bordered, numeric keypad, fontSize 20
- Complete button: filled rose circle when done, outlined when pending
- When completed: row gets a subtle `primaryLight` background tint
- Previous set values shown as placeholder text in inputs

### Exercise Card (in active workout)
```
Exercise Name                    [+ Add Set]
Last: 3×8 @ 185 lbs            (textSecondary, fontSize 13)
─────────────────────────────
Set 1    185    8    ✓
Set 2    185    8    ✓
Set 3    185    6    ○
```

### Empty States
Keep them short and actionable. One line of text + one button. No illustrations for MVP.
