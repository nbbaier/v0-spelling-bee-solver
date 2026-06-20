"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import type { HintSlot } from "@/lib/types"
import { EyeOff, X } from "lucide-react"

function SlotInput({
  slot,
  onCommit,
}: {
  slot: HintSlot
  onCommit: (word: string | null) => void
}) {
  const [value, setValue] = useState(slot.word ?? "")
  const [showDelete, setShowDelete] = useState(false)

  // Keep local state in sync if the puzzle is reset/loaded externally.
  useEffect(() => {
    setValue(slot.word ?? "")
  }, [slot.word])

  const filled = Boolean(slot.word)

  function commit() {
    const trimmed = value.trim()
    onCommit(trimmed.length > 0 ? trimmed : null)
  }

  function handleDelete() {
    setValue("")
    onCommit(null)
    setShowDelete(false)
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => filled && setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <Input
        aria-label={`${slot.prefix} word`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur()
          }
        }}
        placeholder={slot.prefix.toLowerCase() + "…"}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className={cn(
          "h-9 font-mono text-sm uppercase",
          filled && "border-primary/60 bg-primary/10 font-semibold pr-10",
        )}
      />
      {filled && (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{value.length}</span>
          {showDelete && (
            <button
              onClick={handleDelete}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-destructive transition-colors hover:bg-destructive/20"
              aria-label="Delete word"
              type="button"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function HintsList({
  hints,
  onSetWord,
}: {
  hints: HintSlot[]
  onSetWord: (slotId: string, word: string | null) => void
}) {
  const [globalInput, setGlobalInput] = useState("")
  const [letterFilter, setLetterFilter] = useState<string | null>(null)
  const [hideCompleted, setHideCompleted] = useState(false)

  // All unique first letters across prefixes, sorted.
  const letters = useMemo(() => {
    const set = new Set<string>()
    for (const slot of hints) set.add(slot.prefix[0])
    return Array.from(set).sort()
  }, [hints])

  const groups = useMemo(() => {
    const map = new Map<string, HintSlot[]>()
    for (const slot of hints) {
      const arr = map.get(slot.prefix) ?? []
      arr.push(slot)
      map.set(slot.prefix, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [hints])

  // Groups after applying filters.
  const visibleGroups = useMemo(() => {
    return groups.filter(([prefix, slots]) => {
      if (letterFilter && prefix[0] !== letterFilter) return false
      if (hideCompleted && slots.every((s) => s.word)) return false
      return true
    })
  }, [groups, letterFilter, hideCompleted])

  function handleGlobalSubmit() {
    const trimmed = globalInput.trim().toUpperCase()
    if (trimmed.length < 3) return
    const prefix = trimmed.substring(0, 3)
    const group = groups.find(([p]) => p === prefix)
    if (!group) return
    const emptySlot = group[1].find((s) => !s.word)
    if (!emptySlot) return
    onSetWord(emptySlot.id, trimmed)
    setGlobalInput("")
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Words</h2>
        <Toggle
          size="sm"
          pressed={hideCompleted}
          onPressedChange={setHideCompleted}
          aria-label="Hide completed words"
          className="gap-1.5 text-xs"
        >
          <EyeOff size={13} />
          Hide completed
        </Toggle>
      </div>

      {/* Global word entry */}
      <div className="mb-3">
        <Input
          value={globalInput}
          onChange={(e) => setGlobalInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleGlobalSubmit()
            }
          }}
          placeholder="Enter any word…"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="h-9 font-mono text-sm uppercase"
        />
      </div>

      {/* Letter filter pills */}
      {letters.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setLetterFilter(null)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              letterFilter === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
            aria-pressed={letterFilter === null}
          >
            All
          </button>
          {letters.map((l) => (
            <button
              key={l}
              onClick={() => setLetterFilter(letterFilter === l ? null : l)}
              className={cn(
                "rounded-full px-2.5 py-0.5 font-mono text-xs font-medium transition-colors",
                letterFilter === l
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
              aria-pressed={letterFilter === l}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Groups grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleGroups.length === 0 && (
          <p className="col-span-2 py-4 text-center text-sm text-muted-foreground">No groups match the current filters.</p>
        )}
        {visibleGroups.map(([prefix, slots]) => {
          const done = slots.filter((s) => s.word).length
          const complete = done === slots.length
          return (
            <div key={prefix} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-card-foreground">{prefix}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs tabular-nums",
                    complete ? "bg-primary/25 font-semibold text-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {done}/{slots.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {slots.map((slot) => (
                  <SlotInput key={slot.id} slot={slot} onCommit={(w) => onSetWord(slot.id, w)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
