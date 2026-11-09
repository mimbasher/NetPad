import {DI, ILogger} from "aurelia";
import {Viewer} from "../../../../../src/windows/main/work-area/viewers/viewer";
import {ViewableObject} from "../../../../../src/windows/main/work-area/viewers/viewable-object";
import {ViewerHost} from "../../../../../src/windows/main/work-area/viewers/viewer-host";
import {
    IViewerRegistry,
    ViewerRegistry,
} from "../../../../../src/windows/main/work-area/viewers/viewer-registry";

class ViewableA extends ViewableObject {
    constructor() { super("a"); }
    public get name() { return "a"; }
    public get isDirty() { return false; }
    public open(_h: ViewerHost): Promise<void> { return Promise.resolve(); }
    public close(_h: ViewerHost): Promise<void> { return Promise.resolve(); }
    public activate(_h: ViewerHost): Promise<void> { return Promise.resolve(); }
}

class ViewerA extends Viewer {
    constructor(@ILogger logger: ILogger) { super(logger); }
    public canOpen(v: ViewableObject): boolean { return v instanceof ViewableA; }
    public open(): void { /* noop */ }
    public close(): void { /* noop */ }
}

class ViewerB extends Viewer {
    constructor(@ILogger logger: ILogger) { super(logger); }
    public canOpen(v: ViewableObject): boolean { return v instanceof ViewableA; }
    public open(): void { /* noop */ }
    public close(): void { /* noop */ }
}

function makeRegistry(): IViewerRegistry {
    return DI.createContainer().invoke(ViewerRegistry);
}

describe("ViewerRegistry.resolve", () => {
    it("returns the first registered viewer when multiple registrations match the same viewable", () => {
        const registry = makeRegistry();
        registry.register({id: "first", viewerClass: ViewerA, canHandle: () => true});
        registry.register({id: "second", viewerClass: ViewerB, canHandle: () => true});
        expect(registry.resolve(new ViewableA())).toBe(ViewerA);
    });
});
