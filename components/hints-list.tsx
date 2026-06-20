"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import type { HintSlot } from "@/lib/types"
import { EyeOff, X, Trash2 } from "lucide-react"
import { clearAllWordsAction, clearWordsForSlotsAction } from "@/app/actions"

// Returns true if every character in word is in the allowed set.
function hasOnlyAllowedLetters(word: string, allowed: string[]): boolean {
  const set = new Set(allowed.map((l) => l.toUpperCase()))
  return word.toUpperCase().split("").every((ch) => set.has(ch))
}

function SlotInput({
  slot,
  allowedLetters,
  onCommit,
}: {
  slot: HintSlot
  allowedLetters: string[]
  onCommit: (word: string | null) => void
}) {
  const [value, setValue] = useState(slot.word ?? "")
  const [showDelete, setShowDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep local state in sync if the puzzle is reset/loaded externally.
  useEffect(() => {
    setValue(slot.word ?? "")
    setError(null)
  }, [slot.word])

  const filled = Boolean(slot.word)

  function validate(raw: string): string | null {
    const trimmed = raw.trim().toUpperCase()
    if (!trimmed) return null
    if (!trimmed.startsWith(slot.prefix.toUpperCase())) {
      return `Must start with ${slot.prefix.toUpperCase()}`
    }
    if (!hasOnlyAllowedLetters(trimmed, allowedLetters)) {
      return "Contains letters not in this puzzle"
    }
    return null
  }

  function commit() {
    const trimmed = value.trim().toUpperCase()
    const err = validate(trimmed)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    onCommit(trimmed.length > 0 ? trimmed : null)
  }

  function handleDelete() {
    setValue("")
    setError(null)
    onCommit(null)
    setShowDelete(false)
  }

  function handleChange(raw: string) {
    setValue(raw)
    // Clear error as soon as the user starts editing again.
    if (error) setError(null)
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => filled && setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <Input
        aria-label={`${slot.prefix} word`}
        aria-invalid={Boolean(error)}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
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
          filled && !error && "border-primary/60 bg-primary/10 font-semibold pr-10",
          error && "border-destructive bg-destructive/5 pr-10 focus-visible:ring-destructive",
        )}
      />
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
      {filled && !error && (
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
  allowedLetters,
  onSetWord,
  date,
  onClearAllWords,
}: {
  hints: HintSlot[]
  allowedLetters: string[]
  onSetWord: (slotId: string, word: string | null) => void
  date: string
  onClearAllWords: () => void
}) {
  const [globalInput, setGlobalInput] = useState("")
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [letterFilter, setLetterFilter] = useState<string | null>(null)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

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
    if (!trimmed) return

    if (!hasOnlyAllowedLetters(trimmed, allowedLetters)) {
      setGlobalError("Contains letters not in this puzzle")
      return
    }

    if (trimmed.length < 3) {
      setGlobalError("Word must be at least 3 letters")
      return
    }

    const prefix = trimmed.substring(0, 3)
    const group = groups.find(([p]) => p === prefix)
    if (!group) {
      setGlobalError(`No prefix "${prefix}" in this puzzle`)
      return
    }

    const emptySlot = group[1].find((s) => !s.word)
    if (!emptySlot) {
      setGlobalError(`All "${prefix}" slots are already filled`)
      return
    }

    onSetWord(emptySlot.id, trimmed)
    setGlobalInput("")
    setGlobalError(null)
  }

  const handleClearAll = useCallback(async () => {
    setIsClearing(true)
    try {
      if (letterFilter) {
        const slotIds = groups
          .filter(([prefix]) => prefix[0] === letterFilter)
          .flatMap(([, slots]) => slots.map((s) => s.id))
        await clearWordsForSlotsAction(date, slotIds)
      } else {
        await clearAllWordsAction(date)
      }
      onClearAllWords()
      setShowClearDialog(false)
    } finally {
      setIsClearing(false)
    }
  }, [date, letterFilter, groups, onClearAllWords])

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Words</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            disabled={isClearing || hints.every((h) => !h.word)}
          >
            <Trash2 size={13} />
            Clear all
          </Button>
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
      </div>

      {/* Global word entry */}
      <div className="mb-3">
        <Input
          value={globalInput}
          onChange={(e) => {
            setGlobalInput(e.target.value)
            if (globalError) setGlobalError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleGlobalSubmit()
            }
          }}
          aria-invalid={Boolean(globalError)}
          placeholder="Enter any word…"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            "h-9 font-mono text-sm uppercase",
            globalError && "border-destructive bg-destructive/5 focus-visible:ring-destructive",
          )}
        />
        {globalError && (
          <p className="mt-1 text-xs text-destructive">{globalError}</p>
        )}
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
                {slots
                  .filter((slot) => !(hideCompleted && slot.word))
                  .map((slot) => (
                    <SlotInput key={slot.id} slot={slot} allowedLetters={allowedLetters} onCommit={(w) => onSetWord(slot.id, w)} />
                  ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Clear all confirmation dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all words?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all entered words for {letterFilter ? `words starting with "${letterFilter}"` : "this puzzle"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? "Clearing…" : "Clear all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
