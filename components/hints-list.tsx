"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { HintSlot } from "@/lib/types"

function SlotInput({
  slot,
  onCommit,
}: {
  slot: HintSlot
  onCommit: (word: string | null) => void
}) {
  const [value, setValue] = useState(slot.word ?? "")

  // Keep local state in sync if the puzzle is reset/loaded externally.
  useEffect(() => {
    setValue(slot.word ?? "")
  }, [slot.word])

  const filled = Boolean(slot.word)

  function commit() {
    const trimmed = value.trim()
    onCommit(trimmed.length > 0 ? trimmed : null)
  }

  return (
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
        filled && "border-primary/60 bg-primary/10 font-semibold",
      )}
    />
  )
}

export function HintsList({
  hints,
  onSetWord,
}: {
  hints: HintSlot[]
  onSetWord: (slotId: string, word: string | null) => void
}) {
  const groups = useMemo(() => {
    const map = new Map<string, HintSlot[]>()
    for (const slot of hints) {
      const arr = map.get(slot.prefix) ?? []
      arr.push(slot)
      map.set(slot.prefix, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [hints])

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">Hints</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {groups.map(([prefix, slots]) => {
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
