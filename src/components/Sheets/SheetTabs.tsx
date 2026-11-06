type SheetTab = {
  id: number
  label: string
  active?: boolean
}

interface SheetTabsProps {
  tabs: SheetTab[]
  onSelect?: (id: number) => void
  onAdd?: () => void
}

export function SheetTabs({ tabs, onSelect, onAdd }: SheetTabsProps) {
  return (
    <div className="sheet-tabs-row" role="tablist" aria-label="Sheet tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.active}
          className={`sheet-tab ${tab.active ? 'is-active' : ''}`}
          onClick={() => onSelect?.(tab.id)}
        >
          {tab.label}
        </button>
      ))}

      <button type="button" className="sheet-add-tab" aria-label="Add sheet" onClick={onAdd}>
        +
      </button>
    </div>
  )
}
