import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FocusGuards } from '@radix-ui/react-focus-guards';
import { FocusScope } from '@radix-ui/react-focus-scope';
import { UnsplashSearchModal } from '@tryghost/kg-unsplash-selector';
import { Button } from '@tryghost/shade/components';
import { ImageUploadActions } from '@tryghost/shade/patterns';
import { cn } from '@tryghost/shade/utils';
import { useFramework } from '@tryghost/admin-x-framework';
import { unsplashSearchModal } from '@tryghost/test-data/selectors/editor';
import BrandIcon from '@/shared/brand-icon/brand-icon';

export interface UnsplashSelection {
  src: string;
  /** The photographer credit as HTML, which only a captioned field has a home for. */
  caption: string;
}

export interface UnsplashPickerProps {
  /** The site's Unsplash setting: nothing is offered while it is off. */
  enabled: boolean;
  /** Names the button, e.g. `Select feature image from Unsplash`. */
  label: string;
  disabled?: boolean;
  /** Places the button over the dropzone it sits on. */
  className?: string;
  onSelect: (image: UnsplashSelection) => void;
}

/**
 * The Unsplash affordance on an image field: the button over an empty
 * dropzone, and the search modal it opens.
 */
export function UnsplashPicker({
  enabled,
  label,
  disabled,
  className,
  onSelect,
}: UnsplashPickerProps) {
  const { unsplashConfig } = useFramework();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  // A gate that goes off while the search is open closes it, so nothing is left
  // listening for a field the writer can no longer see.
  useEffect(() => {
    if (!enabled) {
      setIsOpen(false);
    }
  }, [enabled]);

  // The modal answers Escape itself but does not mark it, so a settings pane
  // behind it would read the same Escape as its own and close too.
  useEffect(() => {
    if (!modalRoot) {
      return;
    }

    const markHandled = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    };

    modalRoot.addEventListener('keydown', markHandled, true);
    return () => modalRoot.removeEventListener('keydown', markHandled, true);
  }, [modalRoot]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <ImageUploadActions className={cn('top-1 right-1 opacity-100', className)}>
        <Button
          ref={triggerRef}
          aria-label={label}
          className="group/unsplash hover:bg-button-hover"
          disabled={disabled}
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => setIsOpen(true)}
        >
          <BrandIcon
            className="size-4 text-muted-foreground transition-colors group-hover/unsplash:text-foreground"
            name="unsplash"
          />
        </Button>
      </ImageUploadActions>
      {isOpen &&
        createPortal(
          // Keep keyboard navigation and gallery clicks inside the root that
          // marks Escape, so the settings pane behind it never answers too.
          <FocusGuards>
            <FocusScope
              asChild
              loop
              trapped
              onUnmountAutoFocus={(event) => {
                event.preventDefault();
                triggerRef.current?.focus();
              }}
            >
              <div ref={setModalRoot} data-testid={unsplashSearchModal} tabIndex={-1}>
                <UnsplashSearchModal
                  unsplashProviderConfig={unsplashConfig}
                  onClose={() => setIsOpen(false)}
                  onImageInsert={(inserted) => {
                    if (inserted.src) {
                      onSelect({ src: inserted.src, caption: inserted.caption ?? '' });
                    }
                    setIsOpen(false);
                  }}
                />
              </div>
            </FocusScope>
          </FocusGuards>,
          document.body,
        )}
    </>
  );
}
