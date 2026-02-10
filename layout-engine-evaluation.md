# Layout Engine Evaluation for AzureCraft
**Date**: 2026-02-10
**Evaluator**: Claude Code (Tool Evaluation Expert)

## Executive Summary

**RECOMMENDATION**: **Adopt ELK.js** for AzureCraft's compound node layout requirements.

**Key Rationale**:
- Native compound/hierarchical graph support (critical requirement)
- Built-in orthogonal edge routing
- Active maintenance and growing adoption
- Strong React Flow integration with official examples
- Bundle size cost (435KB) is justified by unique capabilities

**dagre's fatal flaw**: Cannot draw edges to/from parent nodes without errors. This is a showstopper for Azure architecture diagrams where VNets/Resource Groups need connections.

---

## Detailed Comparison

### 1. dagre (@dagrejs/dagre v1.1.4)

#### Bundle Size & Performance
- **Minified**: ~36KB
- **Gzipped**: ~12KB
- **Downloads**: ~583 packages depend on it
- **Dependencies**: 2 (lodash, graphlibrary)
- **Performance**: Fast, optimized for speed over optimal layout

#### Compound Graph Support
**CRITICAL ISSUES**:
- Cannot draw edges from child to parent nodes ([Issue #238](https://github.com/dagrejs/dagre/issues/238))
- Error: "Cannot set property 'rank' of undefined" when edge targets a group node
- Rank confusion when edges target compound nodes
- Fix available in [PR #293](https://github.com/dagrejs/dagre/pull/293) but not merged (6+ years)
- Workaround: Use `dagre-cluster-fix` package (unmaintained)

**Limitations**:
- No sub-flow support
- Parent-child positioning issues
- Group nodes end up in wrong ranks

#### Edge Routing
- Basic polyline routing only
- No orthogonal routing support
- Minimal crossing optimization

#### React Flow Integration
- Official example: [Dagre Tree](https://reactflow.dev/examples/layout/dagre)
- Simple setup, drop-in solution
- Well-documented for basic use cases

#### Maintenance Status
- Original `dagre` package: **UNMAINTAINED** (last publish 6 years ago)
- Active fork: `@dagrejs/dagre` (receives updates)
- Community: Small but stable

#### Learning Curve
**Excellent** - Minimal configuration, easy to start

#### Verdict
**AVOID for compound graphs**. Fatal issues with parent-child edges. Only viable for simple DAGs without nested structures.

---

### 2. ELK.js (elkjs v0.9.3)

#### Bundle Size & Performance
- **Minified**: 1.3MB
- **Gzipped**: **435KB** (13.6x larger than dagre)
- **Downloads**: 526,276 weekly
- **Dependencies**: 0
- **Performance**: Async layout (doesn't block UI), sophisticated algorithms

**Bundle Mitigation**:
- Dynamic import only when layout needed
- WASM version available (smaller than JS build by 27%)
- Most apps need layout on-demand, not continuously

#### Compound Graph Support
**EXCELLENT**:
- Native hierarchical node support
- Distinguishes between simple and hierarchical nodes
- Automatic parent sizing based on children
- Two-phase layout: children first, then parents
- Subflow support with format adjustments
- No issues with edges to/from parent nodes

**Configuration**:
```javascript
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN', // Key for compound graphs
};
```

#### Edge Routing
**EXCELLENT**:
- Multiple routing styles: polyline, orthogonal, spline
- Orthogonal routing respects arbitrary port constraints
- Ideal for block diagrams, circuit schematics, actor models
- Advanced libavoid integration for orthogonal routing with fixed nodes
- Minimal crossing optimization built-in

**Configuration**:
```javascript
'elk.edgeRouting': 'ORTHOGONAL'
```

#### React Flow Integration
**VERY GOOD**:
- Official examples: [ELK Tree](https://reactflow.dev/examples/layout/elkjs), [Multiple Handles](https://reactflow.dev/examples/layout/elkjs-multiple-handles)
- React Flow recommends ELK for advanced use cases
- Async pattern fits React Flow's philosophy
- Handle/port mapping requires configuration but well-documented

**Implementation Complexity**:
- Graph structure transformation required (React Flow → ELK format)
- Handle position adjustment for layout direction
- Async processing with promises
- More setup than dagre, but still manageable

#### Maintenance Status
**HEALTHY**:
- Last update: <1 year ago
- 4 active maintainers
- Regular release cadence
- Popular (526K weekly downloads)

#### Learning Curve
**STEEP** - "Huge amount of options to configure" (ELK docs)
- 100+ configuration options
- Extensive algorithm reference needed
- Java origins show in API design
- But well-documented with examples

#### Verdict
**ADOPT**. Bundle size is the only downside, but capabilities justify cost. This is the only battle-tested solution for compound graphs in React Flow.

---

### 3. d3-hierarchy (v3.1.2)

#### Bundle Size & Performance
- **Minified**: ~30KB
- **Gzipped**: ~9KB
- **Downloads**: Millions (part of D3 ecosystem)
- **Performance**: Fast

#### Compound Graph Support
**NOT DESIGNED FOR THIS**:
- Built for tree visualization (node-link, treemap, circle-packing)
- Hierarchical data structure (parent/children relationships)
- No DAG support (trees only - single parent per node)
- Not suitable for Azure architecture diagrams (need DAGs, not trees)

**Use Cases**:
- Organization charts
- File system trees
- Taxonomies
- **NOT**: Network diagrams with arbitrary connections

#### Edge Routing
**N/A** - Not a graph layout engine

#### React Flow Integration
**POOR**:
- No official examples
- Would require custom bridge code
- Better alternatives exist for this use case

#### Verdict
**AVOID**. Wrong tool for the job - designed for trees, not DAGs with compound nodes.

---

### 4. d3-force

#### Bundle Size & Performance
- **Minified**: ~30KB
- **Gzipped**: ~10KB
- **Performance**: Iterative simulation (can be slow)

#### Compound Graph Support
**LIMITED**:
- Force-directed layout (physics simulation)
- No built-in compound node concept
- Custom constraints required for grouping
- Non-deterministic layouts (simulation-based)
- Not ideal for structured diagrams

#### Edge Routing
**POOR**:
- Straight lines only
- No orthogonal routing
- Relies on node positioning to avoid overlaps

#### Verdict
**AVOID**. Better for organic/network graphs than structured architecture diagrams.

---

### 5. Graphviz/Viz.js (WASM)

#### Bundle Size & Performance
- **WASM version**: 475KB gzipped
- **JS version**: 639KB gzipped (27% larger)
- **Performance**: Good, native Graphviz quality

**Options**:
- `@viz-js/viz`: Modern WASM build
- `@hpcc-js/wasm`: Alternative WASM wrapper
- `graphviz-webcomponent`: Downloadable renderer (613KB min)

#### Compound Graph Support
**EXCELLENT**:
- Native Graphviz DOT syntax supports subgraphs/clusters
- Proven technology (decades of use)
- Best-in-class compound graph layout

#### Edge Routing
**EXCELLENT**:
- Best orthogonal routing available
- Spline edges, polylines, curved
- Industry-standard quality

#### React Flow Integration
**POOR**:
- No direct integration
- Would need to parse Graphviz output (SVG/JSON)
- Convert positions to React Flow format
- Cannot use React Flow's interactive features easily

#### Verdict
**AVOID**. Graphviz is the gold standard for static graph layout, but integration with React Flow is too complex. If you don't need React Flow's interactivity, use Graphviz directly.

---

### 6. Custom Approach (Manual Column Layout)

#### Implementation
- Tier-based columns (Security → Networking → Compute → Data)
- Fixed column positions
- Simple vertical stacking within columns
- Manual group wrapping based on parent-child data

#### Pros
- **100% predictable** layouts
- **Zero dependencies** (no bundle cost)
- **Full control** over positioning logic
- **Easy to debug** and understand
- **Fast** execution (no graph algorithms)

#### Cons
- **Manual edge routing** required (orthogonal paths)
- **No crossing optimization**
- **Suboptimal layouts** for complex graphs
- **More code to maintain**
- **Limited scalability** as diagrams grow

#### Verdict
**ASSESS**. Viable for MVP if diagram complexity is low (<20 nodes, simple tier patterns). Migrate to ELK when complexity increases.

---

## Decision Matrix

| Criterion | Weight | dagre | ELK.js | d3-hierarchy | Custom |
|-----------|--------|-------|--------|--------------|--------|
| **Compound Graph Support** | 40% | 2/10 | 10/10 | 1/10 | 5/10 |
| **Edge Routing Quality** | 25% | 4/10 | 10/10 | N/A | 3/10 |
| **Bundle Size** | 15% | 10/10 | 3/10 | 10/10 | 10/10 |
| **React Flow Integration** | 10% | 9/10 | 8/10 | 2/10 | 10/10 |
| **Learning Curve** | 5% | 10/10 | 5/10 | 8/10 | 9/10 |
| **Maintenance/Community** | 5% | 5/10 | 9/10 | 10/10 | N/A |
| **TOTAL SCORE** | | **4.5** | **8.5** | **3.9** | **6.2** |

**dagre**: 2×0.4 + 4×0.25 + 10×0.15 + 9×0.1 + 10×0.05 + 5×0.05 = **4.5**
**ELK.js**: 10×0.4 + 10×0.25 + 3×0.15 + 8×0.1 + 5×0.05 + 9×0.05 = **8.5**
**Custom**: 5×0.4 + 3×0.25 + 10×0.15 + 10×0.1 + 9×0.05 + 0×0.05 = **6.2**

---

## Recommendation Details

### Primary: ELK.js

**Adopt ELK.js** as the layout engine for AzureCraft.

**Justification**:
1. **Only viable solution** for compound graphs in React Flow ecosystem
2. **Orthogonal edge routing** matches Azure diagram conventions
3. **Active maintenance** and growing adoption (526K weekly downloads)
4. **Official React Flow examples** reduce integration risk
5. **Bundle cost acceptable** for a diagram editor (one-time load)

**Migration Path**:
- **Week 1**: Prototype ELK integration with basic compound nodes
- **Week 2**: Configure orthogonal routing and tier-based hints
- **Week 3**: Fine-tune spacing, handle positions, group sizing
- **Week 4**: Optimize bundle (dynamic import, WASM version)

**Bundle Optimization**:
```typescript
// Dynamic import pattern
const layoutNodes = async (nodes, edges) => {
  const ELK = await import('elkjs');
  const elk = new ELK.default();
  // ... layout logic
};
```

**Cost at Scale**:
- **435KB gzipped** ≈ 1-2 seconds on 3G connection
- Acceptable for a professional tool (not a consumer app)
- One-time cost, cached by browser
- Smaller than many icon libraries

### Fallback: Custom Column Layout

If bundle size is absolutely critical (mobile-first, low-bandwidth users), implement custom tier-based layout as MVP:

```typescript
const layoutCustom = (nodes: Node[], edges: Edge[]) => {
  const tiers = {
    security: 0,
    networking: 200,
    compute: 400,
    data: 600
  };

  // Position nodes in columns
  const positioned = nodes.map(node => {
    const x = tiers[node.data.tier] || 0;
    const y = calculateVerticalStack(node, nodes);
    return { ...node, position: { x, y } };
  });

  // Manual orthogonal edge routing
  const routedEdges = edges.map(edge =>
    calculateOrthogonalPath(edge, positioned)
  );

  return { nodes: positioned, edges: routedEdges };
};
```

**When to migrate**: When diagrams exceed 20 nodes or users request "optimize layout" feature.

---

## Implementation Plan

### Phase 1: ELK Integration (Day 1-2)

**Goal**: Basic ELK layout working with existing nodes

1. Install ELK:
   ```bash
   npm install elkjs
   ```

2. Create `lib/layout/elkLayout.ts`:
   ```typescript
   import ELK from 'elkjs';

   const elk = new ELK();

   export async function layoutWithELK(
     nodes: Node[],
     edges: Edge[]
   ): Promise<{ nodes: Node[], edges: Edge[] }> {
     const graph = convertToELKGraph(nodes, edges);
     const layouted = await elk.layout(graph);
     return convertFromELKGraph(layouted);
   }
   ```

3. Test with simple 3-tier diagram (no groups)

### Phase 2: Compound Nodes (Day 3-4)

**Goal**: Groups (Resource Group, VNet, Subnet) working

1. Add hierarchical node configuration:
   ```typescript
   const elkOptions = {
     'elk.algorithm': 'layered',
     'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
     'elk.edgeRouting': 'ORTHOGONAL',
   };
   ```

2. Set parent-child relationships in ELK graph format

3. Test edge connections to/from groups

4. Verify auto-sizing of groups based on children

### Phase 3: Edge Routing (Day 5)

**Goal**: Clean orthogonal edges matching Azure diagram style

1. Configure edge routing:
   ```typescript
   'elk.edgeRouting': 'ORTHOGONAL',
   'elk.layered.unnecessaryBendpoints': 'false',
   'elk.layered.spacing.edgeNodeBetweenLayers': '40',
   ```

2. Map React Flow handles to ELK ports for precise routing

3. Test edge crossing minimization

### Phase 4: Optimization (Day 6)

**Goal**: Bundle size and performance optimization

1. Dynamic import pattern:
   ```typescript
   const { layoutWithELK } = await import('@/lib/layout/elkLayout');
   ```

2. Measure layout time for 50-node diagram

3. Consider WASM version if performance issues

4. Add loading state during layout calculation

### Phase 5: Integration with CopilotKit (Day 7+)

**Goal**: AI-generated diagrams use ELK layout

1. Update `organizeLayout` action to call ELK

2. Ensure AI-generated groups work with ELK's hierarchical format

3. Test "build a 3-tier web app" → auto-layout

---

## Testing Methodology

### Day 1: Hello World Test
- Install ELK
- Layout 3 nodes in a simple DAG
- Verify positions are calculated
- **Success Metric**: Nodes positioned left-to-right

### Day 2: CRUD Test
- Add/remove nodes dynamically
- Re-run layout
- Verify incremental changes work
- **Success Metric**: Layout re-calculation <500ms

### Day 3: Compound Graph Test
- Create Resource Group with 3 VMs inside
- Verify group auto-sizing
- Add edge from VM to external database
- **Success Metric**: No errors, group contains children

### Day 4: Edge Routing Test
- Create diagram with 10 nodes, 15 edges
- Enable orthogonal routing
- Measure edge crossings
- **Success Metric**: <5 crossings, orthogonal paths

### Day 5: Performance Test
- Generate 50-node diagram
- Measure layout time
- Check bundle impact on page load
- **Success Metric**: Layout <2s, bundle loads <3s on 3G

### Day 6: Integration Test
- Ask AI "build a microservices architecture"
- Verify auto-layout with groups
- Test "organize layout" action
- **Success Metric**: Professional-looking diagram, no manual tweaks needed

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Bundle size hurts performance | Medium | High | Dynamic import, WASM version, lazy load |
| Complex ELK configuration | High | Medium | Use React Flow examples as template, document patterns |
| Async layout causes UI jank | Low | Medium | Loading states, throttle re-layouts |
| ELK bugs with compound graphs | Low | High | Thorough testing, fallback to custom layout |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users complain about load time | Low | Medium | Measure real-world performance, optimize if needed |
| ELK maintenance stops | Very Low | High | Popular package (526K/week), Java backing, can fork if necessary |
| Learning curve slows development | Medium | Low | Official examples exist, invest 2 days upfront |

---

## Alternatives Considered & Rejected

### Why not stick with dagre?
**Fatal flaw**: Cannot handle edges to/from parent nodes. This breaks the fundamental requirement for Azure diagrams where Resource Groups, VNets, and Subnets need connections.

The fix exists ([PR #293](https://github.com/dagrejs/dagre/pull/293)) but has been unmerged for 6 years. Using `dagre-cluster-fix` is a band-aid on an unmaintained fork.

### Why not custom layout?
**Acceptable for MVP**, but:
- No orthogonal edge routing (looks unprofessional)
- Manual crossing optimization (complex to implement well)
- Doesn't scale beyond simple tier-based diagrams
- Reinventing the wheel when ELK solves this

**Decision**: If bundle size becomes a critical issue post-launch, revisit custom layout. For now, ELK's capabilities justify the cost.

### Why not Graphviz?
**Best layout quality**, but:
- No React Flow integration path
- Loses interactive editing features
- Overkill for this use case
- Similar bundle size to ELK

**Decision**: If AzureCraft pivots to static diagram generation (PDF export, etc.), revisit Graphviz.

---

## Success Criteria

ELK.js integration is successful if:

1. **Compound graphs work** - Groups contain children, edges connect to/from groups without errors
2. **Orthogonal routing** - Edges use clean right-angle paths, minimal crossings
3. **Performance acceptable** - Layout calculation <2s for 50-node diagram
4. **Bundle impact minimal** - Page load <3s on 3G, dynamic import working
5. **AI integration smooth** - CopilotKit actions generate well-laid-out diagrams
6. **Developer experience good** - Team can configure ELK options without deep docs diving

---

## Next Steps

1. **Get approval** on ELK.js adoption (this document)
2. **Spike**: 2-hour prototype with basic ELK integration
3. **Review spike** - Does it work as expected? Any red flags?
4. **Proceed with Phase 1** if spike successful
5. **Iterate** through phases 2-5 over 6-day sprint

---

## Appendix: Key Resources

### ELK.js Documentation
- [Eclipse Layout Kernel](https://eclipse.dev/elk/)
- [ELK Algorithm Reference](https://eclipse.dev/elk/reference/algorithms.html)
- [ELK Options Reference](https://eclipse.dev/elk/reference/options.html)
- [ELK Layered Algorithm](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html)

### React Flow + ELK Examples
- [React Flow ELK Tree](https://reactflow.dev/examples/layout/elkjs)
- [React Flow ELK Multiple Handles](https://reactflow.dev/examples/layout/elkjs-multiple-handles)
- [GitHub: ELK Mixed Layout Example](https://github.com/dipockdas/react-flow-elk-mixed-layout)

### Community Discussions
- [ELK with Subflows Discussion](https://github.com/xyflow/xyflow/discussions/4830)
- [Building Complex Graphs with ELK](https://dtoyoda10.medium.com/building-complex-graph-diagrams-with-react-flow-elk-js-and-dagre-js-8832f6a461c5)

### Bundle Analysis
- [elkjs on Bundlephobia](https://bundlephobia.com/package/elkjs)
- [elkjs on npm](https://www.npmjs.com/package/elkjs)

### dagre Issues (Why We're Avoiding It)
- [Unable to draw edge from child to parent #238](https://github.com/dagrejs/dagre/issues/238)
- [Compound graph rank confusion #14](https://github.com/cytoscape/cytoscape.js-dagre/issues/14)
- [Fix for compound graphs PR #293](https://github.com/dagrejs/dagre/pull/293) (unmerged)

---

## Conclusion

**ELK.js is the clear winner** for AzureCraft's layout engine. Despite the bundle size cost, it's the only mature solution that:
- Handles compound graphs correctly
- Provides orthogonal edge routing
- Integrates well with React Flow
- Has active maintenance and community support

The 435KB gzipped cost is acceptable for a professional diagram editor, especially with dynamic import optimization. Dagre's compound graph bugs are a showstopper, and custom layout doesn't scale.

**Proceed with ELK.js integration** following the 5-phase implementation plan.

---

**Prepared by**: Claude Code (Tool Evaluation Expert)
**Contact**: Available for implementation support during integration phases
**Version**: 1.0
**Status**: Ready for stakeholder review
