# Layout Engine Decision - Executive Summary

## RECOMMENDATION: Adopt ELK.js

**Bottom Line**: ELK.js is the only viable option for compound graph layouts in React Flow. The 435KB bundle cost is justified by capabilities that cannot be replicated elsewhere.

---

## The Problem

dagre (your current engine) has a **fatal flaw** for Azure diagrams:
- **Cannot draw edges to/from parent nodes** (Resource Groups, VNets)
- Throws "Cannot set property 'rank' of undefined" errors
- Bug unfixed for 6+ years despite known PR

---

## The Solution

**ELK.js** (Eclipse Layout Kernel):
- Native compound graph support (hierarchical nodes)
- Built-in orthogonal edge routing (clean right-angle paths)
- Active maintenance (526K weekly downloads)
- Official React Flow integration examples
- Only downside: 435KB gzipped (vs dagre's 12KB)

---

## Cost-Benefit Analysis

### Costs
- **Bundle Size**: +423KB gzipped (~1-2s on 3G)
- **Learning Curve**: 2 days to understand configuration
- **Complexity**: Async layout, more setup code

### Benefits
- **Works for compound graphs** (dagre doesn't)
- **Professional orthogonal routing** (dagre can't do this)
- **Scalable** (handles complex diagrams)
- **Proven** (used by major diagramming tools)

### Break-Even Point
**Immediate**. dagre literally cannot do what we need. There's no alternative.

---

## Alternatives Considered

| Option | Score | Why Not? |
|--------|-------|----------|
| **dagre** | 4.5/10 | Compound graph bugs (showstopper) |
| **ELK.js** | 8.5/10 | **Winner** - only viable option |
| **d3-hierarchy** | 3.9/10 | Trees only, not DAGs |
| **Custom** | 6.2/10 | No orthogonal routing, doesn't scale |
| **Graphviz** | N/A | No React Flow integration |

---

## Implementation Timeline

**6-Day Sprint Breakdown**:
- **Day 1-2**: Basic ELK integration (simple DAGs)
- **Day 3-4**: Compound nodes (groups working)
- **Day 5**: Edge routing (orthogonal paths)
- **Day 6**: Optimization (dynamic import, bundle)
- **Day 7+**: AI integration (CopilotKit actions)

**Time to First Value**: 2 days
**Time to Production**: 6 days

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Bundle hurts performance | Dynamic import, WASM version, lazy load |
| Complex configuration | Use React Flow examples as template |
| ELK maintenance stops | 526K/week popularity, Java backing, forkable |

---

## Quick Wins

1. **Prototype in 2 hours**: Basic ELK layout with 3 nodes
2. **Demo compound graphs Day 3**: Resource Group with VMs inside
3. **Show orthogonal routing Day 5**: Professional-looking edges

---

## Decision Drivers

**Why This Matters for EY Consulting Lens**:
- **Enterprise clients**: Need professional-looking diagrams (orthogonal routing)
- **Compliance**: Architecture documentation must be accurate (compound graphs)
- **Cost justification**: 435KB bundle ≈ one Azure icon sprite sheet (acceptable)

**Studio Impact**:
- **Enables viral features**: "AI auto-layout" that actually looks good
- **Differentiator**: Cloudcraft-quality layouts in web app
- **Technical debt**: Avoids dagre workarounds that will break

---

## Approval Request

**Proceed with ELK.js integration?**

- [ ] Approved - Start 2-hour spike
- [ ] Needs discussion - What concerns?
- [ ] Rejected - Why? Alternative?

**Next Steps After Approval**:
1. 2-hour spike (prove basic integration works)
2. Review spike results (any red flags?)
3. Proceed with 6-day implementation plan

---

## Supporting Documentation

Full evaluation with decision matrix, bundle analysis, code examples, and risk assessment:
**`layout-engine-evaluation.md`** (15 pages)

---

**Prepared by**: Claude Code (Tool Evaluation Expert)
**Date**: 2026-02-10
**Confidence Level**: High (backed by production examples, community validation)
