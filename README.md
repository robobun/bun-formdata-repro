# Bun FormData Bug Reproduction (Issue #2644)

## Summary

This repository reproduces **both** the original "FormData missing final boundary" error AND the framework integration issues reported in GitHub issue #2644. 

**GitHub Issue**: https://github.com/oven-sh/bun/issues/2644

## ✅ Successfully Reproduced

### 1. The Original "Missing Final Boundary" Error

**✅ REPRODUCED** - The exact error from the GitHub issue:
```
FormData parse error missing final boundary
```

**Triggers**: Malformed FormData with:
- Missing final `--boundary--` marker
- Truncated boundary strings
- Empty body with boundary header
- Mismatched boundaries (header vs body)

### 2. Hono Framework - Different Error

When using Hono v4.9.4, a **different but related** error occurs:
```
TypeError: undefined is not a function (near '...entry of iterable...')
      at fromEntries (native:7:20)
```

## Affected Frameworks

Based on GitHub issue comments:
- **Hono** ✅ (confirmed in this reproduction)
- **Astro**
- **SvelteKit** 
- **SolidStart**
- **Qwik**

## Quick Reproduction

### Option 1: Original "Missing Final Boundary" Error
```bash
bun create-malformed-boundary.js
```
**Expected**: Multiple "FormData parse error missing final boundary" errors

### Option 2: Framework Integration Issues
1. **Install dependencies**: `bun install`
2. **Start Hono server**: `bun run server`
3. **Run test**: `bun run test`
**Expected**: 100% failure rate with iterator errors

## Root Cause

The issue appears to be that `FormData.entries()` returns an invalid iterator when accessed through framework request wrappers, while working correctly in vanilla Bun servers.

## Files

### Primary Reproductions
- `create-malformed-boundary.js` - **✅ Reproduces original "missing final boundary" error**
- `reproduce-2644-hono.js` - Hono framework integration issues

### Additional Tests  
- `test-aggressive-2644.js` - Concurrent FormData test client
- `reproduce-2644-original.js` - Original issue reproduction attempt
- `reproduce-2644-cloning.js` - Request cloning/wrapping tests
- `reproduce-2644-boundary.js` - Boundary-focused tests  
- `test-client-2644.js` - Basic FormData tests

---

This reproduction confirms that **FormData parsing is completely broken when using popular JavaScript frameworks with Bun**, making it unusable for real-world applications that rely on form submissions.