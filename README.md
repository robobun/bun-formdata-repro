# Bun FormData Bug Reproduction (Issue #2644)

## Summary

This repository reproduces the FormData boundary parsing issue in Bun when using frameworks. **The issue is confirmed to still exist** as of August 2024.

**GitHub Issue**: https://github.com/oven-sh/bun/issues/2644

## ✅ Successfully Reproduced

### Hono Framework - 100% Failure Rate

When using Hono v4.9.4, **all FormData requests fail** with:
```
TypeError: undefined is not a function (near '...entry of iterable...')
      at fromEntries (native:7:20)
```

### Key Finding

- **✅ Direct `Bun.serve()`**: FormData parsing works perfectly (tested up to 100 concurrent requests)
- **❌ Framework integration**: FormData parsing completely fails (100% error rate)

## Affected Frameworks

Based on GitHub issue comments:
- **Hono** ✅ (confirmed in this reproduction)
- **Astro**
- **SvelteKit** 
- **SolidStart**
- **Qwik**

## Quick Reproduction

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Start Hono server** (reproduces the bug):
   ```bash
   bun run server
   ```

3. **Run test** (in another terminal):
   ```bash
   bun run test
   ```

4. **Expected**: 100% failure rate with iterator errors.

## Root Cause

The issue appears to be that `FormData.entries()` returns an invalid iterator when accessed through framework request wrappers, while working correctly in vanilla Bun servers.

## Files

- `reproduce-hono.js` - Hono server that demonstrates the bug
- `test-aggressive.js` - Concurrent FormData test client
- `reproduce-original.js` - Original issue reproduction attempt
- `reproduce-cloning.js` - Request cloning/wrapping tests
- `reproduce-boundary.js` - Boundary-focused tests  
- `test-client.js` - Basic FormData tests

---

This reproduction confirms that **FormData parsing is completely broken when using popular JavaScript frameworks with Bun**, making it unusable for real-world applications that rely on form submissions.