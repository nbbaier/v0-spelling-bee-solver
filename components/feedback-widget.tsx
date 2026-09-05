"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { submitFeedback } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);
  const submitting = useRef<boolean>(false);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      // biome-ignore lint/suspicious/noUnnecessaryConditions: another submission can set this mutable ref while awaiting the server.
      if (submitting.current) {
        return;
      }
      submitting.current = true;
      setPending(true);
      setError(null);
      const formData = new FormData(event.currentTarget);
      try {
        const result = await submitFeedback(formData);
        if (result.ok) {
          setIssueUrl(result.url);
          setTitle("");
          setDescription("");
        } else {
          setError(result.error);
        }
      } catch {
        setError(
          "We could not confirm your submission. Check the repository issues before retrying to avoid a duplicate. Your text has been kept."
        );
      } finally {
        submitting.current = false;
        setPending(false);
      }
    },
    []
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    // biome-ignore lint/suspicious/noUnnecessaryConditions: the submit callback mutates this ref while its request is pending.
    if (!submitting.current) {
      setOpen(nextOpen);
      if (nextOpen) {
        setIssueUrl(null);
        setError(null);
      }
    }
  }, []);
  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTitle(event.target.value);
    },
    []
  );
  const handleDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(event.target.value);
    },
    []
  );

  return (
    <footer className="fixed right-4 bottom-4 z-40">
      <Dialog.Root onOpenChange={handleOpenChange} open={open}>
        <Dialog.Trigger render={<Button variant="outline" />}>
          Send feedback
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl bg-popover p-5 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            <Dialog.Title className="font-semibold text-lg">
              Send feedback
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground text-sm">
              Report a bug or suggest an improvement. Your feedback will be
              posted as a public GitHub issue. Please leave out private
              information.
            </Dialog.Description>
            {issueUrl ? (
              <>
                <p role="status">Thanks! Your feedback has been submitted.</p>
                <a
                  className="text-sm underline underline-offset-4"
                  href={issueUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View your GitHub issue
                </a>
                <Dialog.Close render={<Button />}>Done</Dialog.Close>
              </>
            ) : (
              <form
                aria-busy={pending}
                className="grid gap-4"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-2">
                  <Label htmlFor="feedback-title">Title</Label>
                  <Input
                    disabled={pending}
                    id="feedback-title"
                    maxLength={120}
                    name="title"
                    onChange={handleTitleChange}
                    placeholder="A short summary"
                    required
                    value={title}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="feedback-description">Feedback</Label>
                  <Textarea
                    className="min-h-36"
                    disabled={pending}
                    id="feedback-description"
                    maxLength={5000}
                    name="description"
                    onChange={handleDescriptionChange}
                    placeholder="What happened, or what would you like to see?"
                    required
                    value={description}
                  />
                  <p className="text-muted-foreground text-xs">
                    {description.length.toLocaleString()} / 5,000 characters
                  </p>
                </div>
                {!!error && (
                  <p className="text-destructive text-sm" role="alert">
                    {error}
                  </p>
                )}
                <a
                  className="text-muted-foreground text-xs underline underline-offset-4"
                  href="https://github.com/nbbaier/v0-spelling-bee-solver/issues"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Browse existing issues
                </a>
                <div className="flex justify-end gap-2">
                  <Dialog.Close
                    disabled={pending}
                    render={<Button variant="outline" />}
                  >
                    Cancel
                  </Dialog.Close>
                  <Button
                    disabled={pending || !title.trim() || !description.trim()}
                    type="submit"
                  >
                    {pending ? "Sending…" : "Submit feedback"}
                  </Button>
                </div>
                <span className="sr-only" role="status">
                  {pending ? "Sending feedback" : ""}
                </span>
              </form>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </footer>
  );
}
