---
name: Fleet Management System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#4d556b'
  on-tertiary: '#ffffff'
  tertiary-container: '#656d84'
  on-tertiary-container: '#eef0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  sidebar-width: 260px
  sidebar-collapsed: 72px
  container-max: 1440px
---

## Brand & Style

The brand personality is rooted in **reliability, logistical precision, and professional clarity**. As an Enterprise SaaS product for fleet management, the design system must instill confidence in the operator by presenting complex data through a lens of organized calm. 

The design style is **Corporate Modern**, prioritizing high legibility and a systematic hierarchy. It utilizes generous whitespace to reduce cognitive load during high-intensity monitoring tasks. The aesthetic avoids unnecessary decoration, focusing instead on functional elegance through subtle depth, soft geometry, and a structured layout that feels both high-tech and dependable.

## Colors

The palette is designed for multi-tenant flexibility. The **Primary Color** (Corporate Blue) serves as the core brand touchpoint and should be mapped to a single global CSS variable to allow tenants to rebrand the interface instantly.

- **Primary:** Used for main actions, active states, and focus indicators.
- **Secondary/Neutral:** A sophisticated range of cool grays (Slate/Gray scales) used for text, borders, and backgrounds to maintain a clean, high-contrast environment.
- **Semantic Colors:** Critical for fleet management, these colors indicate vehicle health and shipment status (Success/Green, Warning/Amber, Error/Red). These must remain constant regardless of the primary brand color to ensure safety and operational consistency.
- **Surface:** The background defaults to a very light off-white (`#F8FAFC`) to provide a soft canvas that reduces eye strain compared to pure white.

## Typography

The typography system uses **Inter** for its exceptional legibility in data-heavy environments and its neutral, systematic tone. 

- **Hierarchy:** Distinct weight differences separate data labels from data values. 
- **Numerical Data:** For tables and dashboards, use tabular lining figures to ensure columns of numbers align perfectly for quick scanning.
- **Scale:** On mobile devices, `headline-lg` should scale down to 24px (`headline-md`) to ensure headers do not wrap aggressively.
- **Usage:** Use `label-md` for table headers and section overviews to provide a clear structural anchor.

## Layout & Spacing

The layout utilizes a **fluid grid with fixed-width constraints** for readability.

- **Sidebar:** A collapsible left-hand navigation is the primary anchor. It transitions smoothly between 260px and 72px.
- **Data Tables:** These should utilize "Comfortable" spacing by default (16px vertical padding per row) to ensure the PWA remains touch-friendly on tablets.
- **Margins:** Standard page margins are 32px on desktop, scaling down to 16px on mobile.
- **Rhythm:** An 8px linear scale governs all padding and margin decisions, ensuring a consistent visual cadence across all views.

## Elevation & Depth

This design system uses **Ambient Shadows** and **Tonal Layering** to create a sense of organized architecture without the "heaviness" of traditional enterprise software.

- **Surface Levels:** The main background is the lowest level. Content sits on white cards (`#FFFFFF`).
- **Shadows:** Use extremely soft, high-blur shadows with a slight tint of the secondary color (e.g., `rgba(15, 23, 42, 0.08)`) to lift cards off the background.
- **Interactive Depth:** On hover, cards and buttons should slightly increase their shadow spread or shift 2px upward (Y-axis) to provide tactile feedback.
- **Modals:** Use a backdrop blur (12px) on the overlay to maintain context while focusing the user on the task at hand.

## Shapes

The shape language is **Rounded**, reflecting a modern and approachable SaaS feel. 

- **Components:** Standard buttons, input fields, and small cards use a 0.5rem (8px) corner radius.
- **Large Containers:** Dashboard widgets and main content areas use `rounded-lg` (16px) to create a soft, contained look.
- **Status Indicators:** Use fully rounded (pill-shaped) containers for status chips (e.g., "In Transit", "Delayed") to distinguish them from actionable buttons.

## Components

### Buttons & Inputs
- **Primary Action:** Solid fill with the tenant's primary color. 
- **Inputs:** Subtle 1px border (`#E2E8F0`). On focus, the border thickens and adopts the primary color with a soft outer glow (box-shadow).
- **Micro-animations:** All hover states must use a 200ms ease-in-out transition.

### Interactive Status Cards
- **Structure:** Large numerical value, a descriptive label, and a sparkline or percentage trend indicator.
- **Interaction:** Cards should be clickable, leading to filtered views of the data they represent.

### Data Tables
- **Header:** Sticky headers with a subtle bottom border.
- **Rows:** Alternating zebra stripes are not required; instead, use a 1px border-bottom and a subtle hover highlight.
- **Actions:** Use "More" (ellipsis) menus for row actions to keep the interface clean.

### Collapsible Sidebar
- **Icons:** Use clean, 2px stroke-width icons.
- **Active State:** A vertical "indicator bar" on the left edge of the active nav item using the primary color.

### PWA Specifics
- **Navigation:** On mobile, the sidebar should transform into a bottom navigation bar for key actions (Dashboard, Fleet, Alerts, Profile).
- **Feedback:** Use "Toast" notifications for system updates (e.g., "Vehicle 402 has reached its destination").