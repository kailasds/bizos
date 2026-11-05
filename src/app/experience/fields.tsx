import type { DataField, RecordValue } from '@/app/blueprint/types'
import { StatusBadge } from '@/components/os/StatusBadge'
import { formatCurrency } from '@/data/claims.mock'

/** Renders a record value according to its field type (trusted catalogue formatting). */
export function FieldValue({ field, value }: { field: DataField; value: RecordValue | undefined }) {
  if (value === undefined || value === '') return <span className="text-muted-foreground">—</span>
  if (field.type === 'money') return <span className="tabular-nums">{formatCurrency(Number(value))}</span>
  if ((field.type === 'status' || field.type === 'level') && field.options) {
    const option = field.options.find((o) => o.value === value)
    return <StatusBadge tone={option?.tone ?? 'neutral'}>{option?.label ?? String(value)}</StatusBadge>
  }
  return <span>{String(value)}</span>
}
