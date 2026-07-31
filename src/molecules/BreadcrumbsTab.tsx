import { Breadcrumb } from '../components/Breadcrumb'

type Crumb = { id?: string; label: string; state?: 'current' | 'past'; arrow?: boolean }

type BreadcrumbsTabProps = {
  items?: Crumb[]
  /** tap a crumb → navigate to (and focus) that screen */
  onSelect?: (id: string) => void
}

const DEFAULT_ITEMS: Crumb[] = [
  { label: 'Homepage', state: 'past', arrow: false },
  { label: 'Categories', state: 'past' },
  { label: 'Electronics', state: 'past' },
  { label: 'TVs & accessories', state: 'past' },
  { label: 'Premium TVs', state: 'current' },
]

/**
 * Figma: Breadcrumbs Tab (node 35:46574).
 * Floating pill: black 60% fill, backdrop blur(10px), radius 6, padding 6×12, gap 4.
 * A chain of Breadcrumb atoms; the first (source) has no chevron.
 */
export function BreadcrumbsTab({ items = DEFAULT_ITEMS, onSelect }: BreadcrumbsTabProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 12px',
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 6,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {items.map((crumb, i) => (
        <Breadcrumb
          key={`${crumb.label}-${i}`}
          {...crumb}
          onClick={crumb.id && onSelect ? () => onSelect(crumb.id!) : undefined}
        />
      ))}
    </div>
  )
}
