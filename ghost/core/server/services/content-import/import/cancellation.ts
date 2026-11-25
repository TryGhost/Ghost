// Control flow for an intentional stop, never a failed source row.
export class ImportCancelled extends Error {}

/** Poll shared storage independently of row work; transaction boundaries only read local state. */
export class ImportCancellation {
  private timer?: ReturnType<typeof setInterval>;
  private checking?: Promise<void>;
  private cancelled = false;
  private failure?: { error: unknown };

  private readonly requested: () => Promise<boolean>;

  constructor(requested: () => Promise<boolean>) {
    this.requested = requested;
  }

  async start(): Promise<void> {
    await this.check();
    this.throwIfStopped();
    this.timer = setInterval(() => {
      if (!this.checking && !this.cancelled && !this.failure) {
        this.checking = this.check().finally(() => {
          this.checking = undefined;
        });
      }
    }, 2000);
    this.timer.unref();
  }

  private async check(): Promise<void> {
    try {
      this.cancelled = await this.requested();
    } catch (error) {
      this.failure = { error };
    }
  }

  throwIfStopped(): void {
    if (this.failure) {
      throw this.failure.error;
    }
    if (this.cancelled) {
      throw new ImportCancelled('The content import was cancelled.');
    }
  }

  async stop(): Promise<void> {
    clearInterval(this.timer);
    await this.checking;
  }
}
