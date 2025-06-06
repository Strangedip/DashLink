# DashLink: PrimeNG Implementation

This project has been updated to integrate PrimeNG 18, providing a modern and feature-rich user interface.

## PrimeNG Theming

This application uses the `Lara Light Blue` theme from PrimeNG, configured globally in `angular.json`.

### Customization

To change the PrimeNG theme, you can modify the theme import in `angular.json`:

```json
"styles": [
  "node_modules/primeng/resources/themes/lara-light-blue/theme.css",
  "node_modules/primeng/resources/primeng.min.css",
  "node_modules/primeicons/primeicons.css",
  "src/styles.scss"
],
```

Replace `lara-light-blue` with the desired theme from `node_modules/primeng/resources/themes/`.

## Key Component Integration

Several core PrimeNG components have been integrated throughout the application:

*   **Navigation:** `p-menubar` (for the top navigation bar) and `p-sidebar` (for the responsive side navigation).
*   **Form Controls:** `pInputText`, `p-dropdown`, `p-checkbox`, `p-radiobutton`, `p-inputSwitch` are used for various form inputs.
*   **Action Components:** `p-button` is used for all button types, with various `styleClass` attributes for different appearances.
*   **Content Containers:** `p-card` for content grouping and `p-listbox` for displaying lists.
*   **User Feedback:** `p-dynamicDialog` for modal dialogs and `p-toast` for temporary notifications.

### PrimeNG Showcase Component

A new component, `MaterialShowcaseComponent` (now effectively a `PrimeNGShowcaseComponent`), is accessible via the `/material-showcase` route. This component demonstrates the integrated PrimeNG components and their styling.

## Firebase Integration

Existing Firebase integrations (authentication, Firestore data display/manipulation) continue to function correctly and seamlessly with the new PrimeNG UI.

## Code Quality

*   SCSS files have been updated to reflect PrimeNG's styling approach.
*   Angular best practices have been followed for component architecture and module imports.
