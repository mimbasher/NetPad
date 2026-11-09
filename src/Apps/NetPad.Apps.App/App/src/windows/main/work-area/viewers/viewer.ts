import {ViewableObject} from "./viewable-object";
import {ViewModelBase} from "@application/view-model-base";
import {observable} from "@aurelia/runtime";
import {ViewerHost} from "./viewer-host";
import {ILogger} from "aurelia";

export abstract class Viewer extends ViewModelBase {
    @observable public viewable: ViewableObject;
    private _host?: ViewerHost;

    protected constructor(logger: ILogger) {
        super(logger);
    }

    public get host(): ViewerHost {
        if (!this._host) {
            throw new Error(`${this.constructor.name}.host accessed before setHost() was called.`);
        }
        return this._host;
    }

    public setHost(host: ViewerHost): void {
        this._host = host;
    }

    public abstract canOpen(viewable: ViewableObject): boolean;

    public abstract open(viewable: ViewableObject): void;

    public abstract close(viewable: ViewableObject): void;
}
