import {Constructable, DI, ILogger, resolve} from "aurelia";
import {Viewer} from "./viewer";
import {ViewableObject} from "./viewable-object";

export const IViewerRegistry = DI.createInterface<IViewerRegistry>();

export interface IViewerRegistration {
    /**
     * Stable identifier for the viewer. Used for diagnostics and duplicate detection.
     * Examples: "script", "repl", "text-file".
     */
    readonly id: string;

    /**
     * The viewer class. Must be a subclass of {@link Viewer}.
     */
    readonly viewerClass: Constructable<Viewer>;

    /**
     * Predicate that returns true if this viewer can open the given viewable.
     * Typically an `instanceof` check against a specific viewable subclass.
     */
    readonly canHandle: (viewable: ViewableObject) => boolean;
}

export interface IViewerRegistry {
    register(registration: IViewerRegistration): void;
    resolve(viewable: ViewableObject): Constructable<Viewer> | undefined;
}

export class ViewerRegistry implements IViewerRegistry {
    private readonly registrations: IViewerRegistration[] = [];
    private readonly warnedOverlaps = new Set<string>();
    private readonly logger = resolve(ILogger).scopeTo(nameof(ViewerRegistry));

    public register(registration: IViewerRegistration): void {
        if (!(registration.viewerClass.prototype instanceof Viewer)) {
            throw new Error(`viewerClass "${registration.viewerClass.name}" is not a type of Viewer`);
        }

        if (this.registrations.some(r => r.id === registration.id)) {
            throw new Error(`A viewer with id "${registration.id}" is already registered`);
        }

        this.registrations.push(registration);
    }

    public resolve(viewable: ViewableObject): Constructable<Viewer> | undefined {
        const matches = this.registrations.filter(r => r.canHandle(viewable));

        if (matches.length > 1) {
            const key = matches.map(m => m.id).join("|");
            if (!this.warnedOverlaps.has(key)) {
                this.warnedOverlaps.add(key);
                this.logger.warn(
                    `Multiple viewers match viewable "${viewable.toString()}": [${matches.map(m => m.id).join(", ")}]. ` +
                    `"${matches[0].id}" wins (first registered). ` +
                    `If this overlap is intentional, ignore; otherwise narrow the canHandle predicate.`
                );
            }
        }

        return matches[0]?.viewerClass;
    }
}
