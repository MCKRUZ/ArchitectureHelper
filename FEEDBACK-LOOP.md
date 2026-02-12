# Autonomous Feedback Loop System

This system enables Claude to autonomously test, analyze, and iterate on UI improvements.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                   FEEDBACK LOOP CYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Make Code Changes      → Edit files                      │
│          ↓                                                    │
│  2. Run Visual Tests       → Playwright captures screenshots │
│          ↓                                                    │
│  3. Analyze Screenshots    → Claude reads images             │
│          ↓                                                    │
│  4. Assess Results         → Good? Done! Bad? Continue...    │
│          ↓                                                    │
│  5. Identify Issues        → What's wrong?                   │
│          ↓                                                    │
│  6. Plan Fixes            → What to change?                  │
│          ↓                                                    │
│  7. Back to Step 1        → Make more changes                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Ensure dev server is running
```powershell
cd apps/web
npm run dev
```

### 2. Run the visual feedback loop
```powershell
cd apps/web
pwsh ./run-visual-test.ps1
```

### 3. Screenshots are saved to:
```
.screenshots/
├── initial-state-{timestamp}.png
├── canvas-{timestamp}.png
├── generated-arch-{timestamp}.png
├── multi-env-{timestamp}.png
└── edges-zoomed-{timestamp}.png
```

### 4. Claude analyzes and iterates
Claude reads the screenshots and:
- Identifies visual issues
- Makes code changes
- Reruns tests
- Repeats until satisfied

## Testing Scenarios

The system tests:
- **Initial State**: Clean canvas, UI layout
- **Architecture Generation**: Creates a simple architecture
- **Multi-Environment**: Tests dev/test/prod generation
- **Edge Routing**: Zooms in to inspect edge paths

## Customizing Tests

Edit `tests/visual-feedback-loop.spec.ts` to:
- Add new test scenarios
- Change prompts
- Adjust wait times
- Capture different views

## Example Usage

```bash
# Run full visual test suite
pwsh ./run-visual-test.ps1

# Run specific test
npx playwright test tests/visual-feedback-loop.spec.ts -g "multi-environment"

# Run with UI (see browser actions)
npx playwright test tests/visual-feedback-loop.spec.ts --headed

# Debug mode
npx playwright test tests/visual-feedback-loop.spec.ts --debug
```

## Benefits

✅ **Autonomous Testing** - No manual browser interaction needed
✅ **Visual Verification** - Claude sees exactly what users see
✅ **Rapid Iteration** - Quick feedback cycles
✅ **Reproducible** - Same tests every time
✅ **Documentation** - Screenshots serve as visual history

## Workflow for Edge Routing Fixes

1. **Capture Current State**
   ```powershell
   pwsh ./run-visual-test.ps1
   ```

2. **Claude Analyzes Screenshots**
   - Identifies crossing edges
   - Sees routing issues
   - Plans fixes

3. **Make Code Changes**
   - Update routing logic
   - Adjust channel positions
   - Fix waypoint calculations

4. **Retest**
   ```powershell
   pwsh ./run-visual-test.ps1
   ```

5. **Compare Before/After**
   - Are edges cleaner?
   - Fewer crossings?
   - Better layout?

6. **Repeat Until Perfect**

## Next Steps

After this system is working, we can:
- Add visual regression testing (compare screenshots automatically)
- Create success criteria metrics (% of edge crossings)
- Build automated diff reports
- Add performance benchmarking
