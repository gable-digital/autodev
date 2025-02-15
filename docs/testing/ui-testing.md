# UI Testing Guide

This guide explains how to run and maintain UI tests for the AutoDev extension.

## Setup

1. Install dependencies:
   ```bash
   cd webview-ui
   npm install
   ```

2. Install Playwright browser:
   ```bash
   npm run playwright:install
   ```

## Running Tests

### Run All UI Tests
```bash
npm run test:ui
```

### Run Tests in Debug Mode
```bash
npm run test:ui:debug
```
This opens Playwright's inspector, allowing you to:
- Step through test execution
- Inspect elements
- Debug test failures

### Update Visual Snapshots
```bash
npm run test:ui:update
```
Use this when you've made intentional UI changes that affect the visual snapshots.

## Test Structure

### Visual Regression Tests
- Located in `webview-ui/tests/ui/`
- Uses Playwright's screenshot comparison
- Masks dynamic elements (icons, timestamps)
- Allows small pixel differences (configured in playwright.config.ts)

### Test Files
1. `chat.test.ts`
   - Verifies chat input positioning
   - Checks full-width layout
   - Tests scroll behavior
   - Validates visual appearance

## Writing Tests

### Best Practices
1. Use data-testid attributes for element selection
2. Mask dynamic content in screenshots
3. Allow small pixel differences for cross-platform compatibility
4. Test both initial state and interaction states

### Example Test
```typescript
test('component should behave correctly', async ({ page }) => {
  // Launch extension
  await page.goto('http://localhost:3000');
  
  // Wait for element
  await page.waitForSelector('[data-testid="element"]');
  
  // Interact
  await page.click('[data-testid="button"]');
  
  // Verify
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
  
  // Screenshot
  await expect(page).toHaveScreenshot('state.png', {
    mask: [page.locator('.dynamic-content')],
    maxDiffPixelRatio: 0.01
  });
});
```

## Maintenance

### When to Update Snapshots
1. Intentional UI changes
2. Theme updates
3. Component restructuring

### When to Add New Tests
1. New UI components
2. New interaction patterns
3. Bug fixes (add regression tests)

## Debugging Failed Tests

1. Check the test report:
   ```bash
   npx playwright show-report
   ```

2. Compare failed screenshots:
   - `test-results/` contains actual vs expected
   - Use `test:ui:debug` to investigate

3. Common Issues:
   - Dynamic content not masked
   - Timing issues (add proper waits)
   - Platform-specific rendering
   - Theme/color variations
