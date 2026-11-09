// Minimal stub for tests that transitively load monaco-editor but don't call into it.
// Jest can't resolve the real monaco-editor package (its package.json declares only `module`,
// not `main`, so the default CommonJS resolver gives up). Tests that don't exercise editor
// behavior get this no-op stand-in via moduleNameMapper.

class StubModel {
    public dispose(): void { /* noop */ }
    public onDidChangeContent(): { dispose(): void } { return { dispose() { /* noop */ } }; }
    public getValue(): string { return ""; }
    public setValue(): void { /* noop */ }
}

class StubSelection {
    public isEmpty(): boolean { return true; }
}

class StubRange {}

class StubUri {
    public static parse(): StubUri { return new StubUri(); }
}

export const editor = {
    createModel: (..._args: unknown[]) => new StubModel(),
    setModelLanguage: (..._args: unknown[]): void => { /* noop */ },
};

export const Selection = StubSelection;
export const Range = StubRange;
export const Uri = StubUri;
