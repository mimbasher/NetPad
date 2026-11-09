import {DI, IContainer, Registration} from "aurelia";
import {ViewerHost} from "../../../../../src/windows/main/work-area/viewers/viewer-host";
import {ViewerHostCollection} from "../../../../../src/windows/main/work-area/viewers/viewer-host-collection";
import {
    IViewerRegistry,
    ViewerRegistry,
} from "../../../../../src/windows/main/work-area/viewers/viewer-registry";

function makeContainer(): IContainer {
    const container = DI.createContainer();
    container.register(Registration.singleton(IViewerRegistry, ViewerRegistry));
    return container;
}

describe("ViewerHostCollection.add", () => {
    it("assigns 'main' to the first host and 'split-N' to subsequent hosts", () => {
        const container = makeContainer();
        const collection = new ViewerHostCollection();
        const h1 = container.invoke(ViewerHost);
        const h2 = container.invoke(ViewerHost);
        const h3 = container.invoke(ViewerHost);

        collection.add(h1);
        collection.add(h2);
        collection.add(h3);

        expect(h1.name).toBe("main");
        expect(h2.name).toBe("split-1");
        expect(h3.name).toBe("split-2");
    });
});
