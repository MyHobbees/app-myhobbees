import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const styles = {
  muted: 'bg-muted text-muted-foreground',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/15 text-green-600 dark:text-green-400',
  destructive: 'bg-destructive/15 text-destructive',
}

export function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <Badge className={cn('gap-1.5 border-transparent', className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  )
}

const fulfillmentMap: Record<string, { label: string; style: keyof typeof styles }> = {
  UNFULFILLED: { label: 'En attente', style: 'muted' },
  SCHEDULED: { label: 'En attente', style: 'muted' },
  ON_HOLD: { label: 'En attente', style: 'muted' },
  OPEN: { label: 'En attente', style: 'muted' },
  PENDING_FULFILLMENT: { label: 'En attente', style: 'muted' },
  IN_PROGRESS: { label: 'En préparation', style: 'amber' },
  PARTIALLY_FULFILLED: { label: 'En préparation', style: 'amber' },
  FULFILLED: { label: 'Expédiée', style: 'blue' },
}

const financialMap: Record<string, { label: string; style: keyof typeof styles }> = {
  PAID: { label: 'Payée', style: 'green' },
  PENDING: { label: 'En attente', style: 'amber' },
  AUTHORIZED: { label: 'En attente', style: 'amber' },
  PARTIALLY_PAID: { label: 'Partiellement payée', style: 'amber' },
  REFUNDED: { label: 'Remboursée', style: 'destructive' },
  PARTIALLY_REFUNDED: { label: 'Remboursée', style: 'destructive' },
  VOIDED: { label: 'Annulée', style: 'destructive' },
  EXPIRED: { label: 'Expirée', style: 'destructive' },
}

const productMap: Record<string, { label: string; style: keyof typeof styles }> = {
  ACTIVE: { label: 'Actif', style: 'green' },
  DRAFT: { label: 'Brouillon', style: 'amber' },
  ARCHIVED: { label: 'Archivé', style: 'muted' },
  UNLISTED: { label: 'Non listé', style: 'muted' },
}

function mappedBadge(
  map: Record<string, { label: string; style: keyof typeof styles }>,
  status: string,
) {
  const entry = map[status] ?? { label: status, style: 'muted' as const }
  return <StatusBadge label={entry.label} className={styles[entry.style]} />
}

export function ShopifyFulfillmentBadge({ status }: { status: string }) {
  return mappedBadge(fulfillmentMap, status)
}

export function ShopifyFinancialBadge({ status }: { status: string }) {
  return mappedBadge(financialMap, status)
}

export function ProductStatusBadge({ status }: { status: string }) {
  return mappedBadge(productMap, status)
}

export function OrderStateBadge({
  fulfillmentStatus,
  cancelled,
  preparing,
}: {
  fulfillmentStatus: string
  cancelled?: boolean
  preparing?: boolean
}) {
  if (cancelled) {
    return <StatusBadge label="Annulée" className={styles.destructive} />
  }
  if (preparing && fulfillmentStatus !== 'FULFILLED') {
    return <StatusBadge label="En préparation" className={styles.amber} />
  }
  return mappedBadge(fulfillmentMap, fulfillmentStatus)
}
