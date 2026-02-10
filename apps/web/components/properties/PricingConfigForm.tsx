'use client';

import { useCallback, useMemo } from 'react';
import type { AzureServiceType } from '@/lib/state/types';
import type { PricingField, CostBreakdown } from '@/lib/pricing/types';
import { PRICING_DESCRIPTORS } from '@/lib/pricing/descriptors';
import { calculateServiceCost } from '@/lib/pricing/calculateCost';

interface PricingConfigFormProps {
  serviceType: AzureServiceType;
  config: Record<string, unknown>;
  region: string;
  onChange: (config: Record<string, unknown>, breakdown: CostBreakdown) => void;
}

export function PricingConfigForm({ serviceType, config, region, onChange }: PricingConfigFormProps) {
  const descriptor = PRICING_DESCRIPTORS[serviceType];

  const visibleFields = useMemo(() => {
    if (!descriptor) return [];
    return descriptor.fields.filter(field => isFieldVisible(field, config));
  }, [descriptor, config]);

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      const newConfig = { ...config, [key]: value };
      const breakdown = calculateServiceCost(serviceType, newConfig, region);
      onChange(newConfig, breakdown);
    },
    [config, serviceType, region, onChange],
  );

  if (!descriptor) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No configurable pricing parameters for this service.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visibleFields.map(field => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={(val) => handleFieldChange(field.key, val)}
        />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isFieldVisible(field: PricingField, config: Record<string, unknown>): boolean {
  if (!field.dependsOn) return true;
  const currentValue = config[field.dependsOn.field] as string;
  if (Array.isArray(field.dependsOn.value)) {
    return field.dependsOn.value.includes(currentValue);
  }
  return currentValue === field.dependsOn.value;
}

// ─── Field Renderer ───────────────────────────────────────────────────────────

interface FieldRendererProps {
  field: PricingField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const inputClass = 'w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary';

  if (field.type === 'select') {
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {field.label}
          {field.tooltip && <span className="ml-1 text-muted-foreground/60" title={field.tooltip}>?</span>}
        </label>
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          {field.optionGroups?.map(group => (
            <optgroup key={group.group} label={group.group}>
              {group.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {field.label}
          {field.tooltip && <span className="ml-1 text-muted-foreground/60" title={field.tooltip}>?</span>}
        </label>
        <div className="relative">
          <input
            type="number"
            value={(value as number) ?? field.min ?? 0}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className={inputClass + (field.unit ? ' pr-16' : '')}
          />
          {field.unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
              {field.unit}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (field.type === 'toggle') {
    return (
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          {field.label}
          {field.tooltip && <span className="ml-1 text-muted-foreground/60" title={field.tooltip}>?</span>}
        </label>
        <input
          type="checkbox"
          checked={(value as boolean) ?? false}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-gray-300"
        />
      </div>
    );
  }

  return null;
}
