# Architecture Validator

## Overview

The Architecture Validator automatically checks and fixes Azure diagrams to follow Well-Architected Framework best practices. It runs **automatically after AI generation** to ensure proper service placement, grouping, and hierarchy.

## What It Checks

### 1. Required Groups

✅ **Ensures these groups exist:**
- Resource Group (contains everything)
- Virtual Network (contains compute + data services)
- App Subnet (compute tier)
- Data Subnet (data tier)

If any are missing, they're automatically created.

### 2. Group Hierarchy

✅ **Enforces proper nesting:**
```
Resource Group
└── Virtual Network (10.0.0.0/16)
    ├── App Subnet (10.0.1.0/24)
    └── Data Subnet (10.0.2.0/24)
```

If groups are misplaced (e.g., VNet outside RG), they're automatically moved.

### 3. Service Placement Rules

#### Global Services (NEVER in a subnet)
These sit at the Resource Group level, **outside the VNet**:
- Front Door
- Entra ID (Azure AD)
- DDoS Protection
- Log Analytics
- Application Insights

**Why:** These are global/regional services that operate at a higher network layer.

#### App Subnet Services (Compute tier)
These go **inside App Subnet (10.0.1.0/24)**:
- App Service
- Function App
- Container Apps
- AKS (Kubernetes)
- Virtual Machines
- API Management
- Application Gateway
- Static Web Apps
- Azure OpenAI
- AI Search

**Why:** Application workloads need network isolation and can communicate within the subnet.

#### Data Subnet Services (Data tier)
These go **inside Data Subnet (10.0.2.0/24)**:
- Cosmos DB
- SQL Database
- Redis Cache
- Storage Account
- Service Bus
- Event Hub
- Event Grid

**Why:** Data services should be isolated from compute tier for security and network traffic management.

#### Security Services
- Key Vault → App Subnet (default)

**Why:** Commonly accessed by compute services, so placed in same subnet for low latency.

## Auto-Fixes Applied

When the validator runs, it automatically:

1. **Creates missing groups** (RG, VNet, App Subnet, Data Subnet)
2. **Fixes group hierarchy** (moves VNet inside RG, subnets inside VNet)
3. **Moves misplaced services** (e.g., Front Door out of subnets, SQL into Data Subnet)
4. **Assigns orphaned services** (ensures all services belong to at least Resource Group)

## Example Fixes

### Before Validation
```
❌ Front Door → inside App Subnet (WRONG - global service)
❌ SQL Database → outside any subnet (WRONG - needs isolation)
❌ VNet → not inside Resource Group (WRONG - hierarchy)
❌ API Management → in Data Subnet (WRONG - compute service)
```

### After Auto-Fix
```
✅ Front Door → Resource Group level (global service)
✅ SQL Database → Data Subnet (data tier)
✅ VNet → inside Resource Group (proper hierarchy)
✅ API Management → App Subnet (compute service)
```

## How to See Validation Results

After AI generates an architecture, check the console output:

```
[generateArchitecture] Validation: ⚠️ Architecture validation found issues:

1. Front Door (front-door) should NOT be in a subnet (global service)
2. SQL Database (sql-database) should be in Data Subnet
3. VNet not inside Resource Group

🔧 Auto-fixes applied:

1. Removed Front Door from subnet (global service)
2. Moved SQL Database to Data Subnet
3. Moved VNet inside Resource Group
```

The AI response message will also include:
```
Generated architecture: 12 services, 15 connections, 4 groups.
Est. cost: $1,234/mo. Auto-fixed 3 architecture issues.
WAF Review: All checks passed!
```

## Troubleshooting

### "Service X is in the wrong subnet"
The validator will auto-fix this. Check the service type classification in `architectureValidator.ts` if you disagree with the placement.

### "VNet/Subnets overlapping"
The validator fixes logical parent relationships. After auto-fix, use the `organizeLayout` action to visually separate them.

### "Still seeing issues after validation"
1. Check browser console for validation messages
2. Verify the validator ran (look for `[generateArchitecture] Validation:` log)
3. If issues persist, manually regenerate the architecture

## Technical Details

**Location:** `apps/web/lib/validators/architectureValidator.ts`

**Integration:** Runs in `useCopilotActions.ts` → `generateArchitecture` handler (Step 6, before batchUpdate)

**Pure Function:** `validateAndFixArchitecture(nodes)` takes nodes, returns fixed nodes + validation result

**No Side Effects:** All fixes are applied to in-memory copies before state mutation

## Future Enhancements

- [ ] Support for custom subnets (Gateway Subnet, Security Subnet, etc.)
- [ ] Region-specific validation (e.g., availability zones)
- [ ] Multi-VNet scenarios (hub-spoke topology)
- [ ] Private endpoint validation (data services should use private endpoints)
- [ ] NSG/routing validation
