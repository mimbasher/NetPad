import {DI, IContainer, ILogger, Registration} from "aurelia";
import {Viewer} from "../../../../../src/windows/main/work-area/viewers/viewer";
import {ViewableObject} from "../../../../../src/windows/main/work-area/viewers/viewable-object";
import {ViewerHost} from "../../../../../src/windows/main/work-area/viewers/viewer-host";
import {
    IViewerRegistry,
    ViewerRegistry,
} from "../../../../../src/windows/main/work-area/viewers/viewer-registry";

class TestViewableA extends ViewableObject {
    constructor(id: string) { super(id); }
    public get name() { return `a-${this.id}`; }
    public get isDirty() { return false; }
    public open(_h: ViewerHost): Promise<void> { return Promise.resolve(); }
    public close(_h: ViewerHost): Promise<void> { return Promise.resolve(); }
    public activate(_h: ViewerHost): Promise<void> { return Promise.resolve(); }
}

class TestViewableB extends ViewableObject {
    constructor(id: string) { super(id); }
    public get name() { return `b-${this.id}`; }
    public get isDirty() { return false; }
    public open(_h: ViewerHost): Promise<void> { return Promise.resolve(); }
    public close(_h: ViewerHost): Promise<void> { return Promise.resolve(); }
    public activate(_h: ViewerHost): Promise<void> { return Promise.resolve(); }
}

class ViewerA extends Viewer {
    public closeCalls: ViewableObject[] = [];
    public disposeCalls = 0;
    constructor(@ILogger logger: ILogger) { super(logger); }
    public canOpen(v: ViewableObject): boolean { return v instanceof TestViewableA; }
    public open(v: ViewableObject): void { this.viewable = v; }
    public close(v: ViewableObject): void { this.closeCalls.push(v); }
    public override dispose(): void { this.disposeCalls++; super.dispose(); }
}

class ViewerB extends Viewer {
    public disposeCalls = 0;
    constructor(@ILogger logger: ILogger) { super(logger); }
    public canOpen(v: ViewableObject): boolean { return v instanceof TestViewableB; }
    public open(v: ViewableObject): void { this.viewable = v; }
    public close(): void { /* noop */ }
    public override dispose(): void { this.disposeCalls++; super.dispose(); }
}

function setup(): {container: IContainer, host: ViewerHost} {
    const container = DI.createContainer();
    container.register(Registration.singleton(IViewerRegistry, ViewerRegistry));
    const registry = container.get(IViewerRegistry);
    registry.register({id: "a", viewerClass: ViewerA, canHandle: v => v instanceof TestViewableA});
    registry.register({id: "b", viewerClass: ViewerB, canHandle: v => v instanceof TestViewableB});
    return {container, host: container.invoke(ViewerHost)};
}

describe("ViewerHost.removeViewables", () => {
    it("tells the matching viewer to close the removed viewables", () => {
        const {host} = setup();
        const v1 = new TestViewableA("1");
        const v2 = new TestViewableA("2");
        host.addViewables(v1, v2);
        host.activate(v1);
        const viewer = host.activeViewer as ViewerA;

        host.removeViewables(v2);

        expect(host.viewables.has(v2)).toBe(false);
        expect(viewer.closeCalls).toEqual([v2]);
    });

    it("auto-activates the next viewable when the active one is removed", () => {
        const {host} = setup();
        const v1 = new TestViewableA("1");
        const v2 = new TestViewableA("2");
        host.addViewables(v1, v2);
        host.activate(v1);

        host.removeViewables(v1);

        expect(host.activeViewable).toBe(v2);
    });

    it("clears active viewable and viewer when the last viewable is removed", () => {
        const {host} = setup();
        const v1 = new TestViewableA("1");
        host.addViewables(v1);
        host.activate(v1);

        host.removeViewables(v1);

        expect(host.activeViewable).toBeUndefined();
        expect(host.activeViewer).toBeUndefined();
    });

    it("disposes and drops a viewer that has no remaining viewable it can open", () => {
        const {host} = setup();
        const a = new TestViewableA("a1");
        const b = new TestViewableB("b1");
        host.addViewables(a, b);
        host.activate(a);
        host.activate(b);
        const viewerForA = host.viewers.find(v => v instanceof ViewerA) as ViewerA;
        const viewerForB = host.viewers.find(v => v instanceof ViewerB) as ViewerB;

        host.removeViewables(a);

        expect(viewerForA.disposeCalls).toBe(1);
        expect(host.viewers).not.toContain(viewerForA);
        expect(viewerForB.disposeCalls).toBe(0);
        expect(host.viewers).toContain(viewerForB);
    });

    it("keeps a viewer that still has at least one matching viewable", () => {
        const {host} = setup();
        const a1 = new TestViewableA("a1");
        const a2 = new TestViewableA("a2");
        host.addViewables(a1, a2);
        host.activate(a1);
        const viewer = host.activeViewer as ViewerA;

        host.removeViewables(a1);

        expect(viewer.disposeCalls).toBe(0);
        expect(host.viewers).toContain(viewer);
    });
});
