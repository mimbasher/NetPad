import {WithDisposables} from "@common";
import {ResizableTable} from "@application/tables/resizable-table";
import {IconName, createIconElement} from "@application/ui/np-icon/icons";

export class ResultControls extends WithDisposables {
    private static readonly barGraphHeaderAttr = "data-bar-graph";
    private static readonly barGraphValueAttr = "data-bar-graph-value";

    constructor(private readonly resultsElement: HTMLElement) {
        super();
    }

    public bind(content: DocumentFragment) {

        for (const titledGroup of Array.from(content.querySelectorAll(".group.titled"))) {
            const title = titledGroup.querySelector(".title");
            if (!title) continue;

            const table = ResultControls.titledTable(titledGroup);

            const clickHandler = (e: Event) => {
                const selection = document.getSelection();
                if (selection && selection.toString() && (e.target as Element).contains(selection.anchorNode)) return;

                if (table) this.toggle(table);
                else if (titledGroup.classList.contains("collapsed")) titledGroup.classList.remove("collapsed");
                else titledGroup.classList.add("collapsed");
            };

            title.addEventListener("click", clickHandler);
            this.addDisposable(() => title.removeEventListener("click", clickHandler));
        }

        for (const table of Array.from(content.querySelectorAll("table"))) {

            table.classList.add("table", "table-sm", "table-bordered");

            table.parentElement?.classList.add("has-table");

            // Collapse/Expand functionality
            const collapseTarget = this.getTableCollapseTarget(table);
            if (collapseTarget) {
                collapseTarget.classList.add("collapse-actionable");
                const clickHandler = (e: Event) => {
                    const selection = document.getSelection();
                    if (selection && selection.toString() && (e.target as Element).contains(selection.anchorNode)) return;

                    if ((e.target as Element).closest("a")) return;

                    this.toggle(table);
                };
                collapseTarget.addEventListener("click", clickHandler);

                this.addDisposable(() => {
                    collapseTarget?.removeEventListener("click", clickHandler);
                });

                this.placeCaret(table);
            }

            const resizableTable = new ResizableTable(table, collapseTarget);
            resizableTable.init();
            this.addDisposable(resizableTable);

            this.addBarGraphControls(table);
            this.classifyValues(table);
        }

        for (const group of Array.from(content.querySelectorAll(".group[data-destruct]:not([data-destruct=''])"))) {
            const val = group.getAttribute("data-destruct");
            if (!val) {
                continue;
            }

            const milliseconds = Number(val);
            if (isNaN(milliseconds)) {
                continue;
            }

            setTimeout(() => group.remove(), milliseconds);
        }
    }

    /**
     * Decides which columns of a table hold nothing but numbers, and marks every cell in them so
     * they can align right.
     */
    private classifyValues(table: HTMLTableElement) {
        if (table.tBodies.length === 0) return;

        const isCollection = !!table.querySelector(":scope > thead > tr.table-data-header");
        if (isCollection) {
            table.classList.add("columnar");
        }

        // A column is numeric only if every value in it is.
        const numericColumns = new Map<number, boolean>();

        for (const row of Array.from(table.querySelectorAll(":scope > tbody > tr"))) {
            const cells = Array.from(row.children) as HTMLTableCellElement[];

            for (let index = 0; index < cells.length; index++) {
                const cell = cells[index];
                if (cell.tagName !== "TD") continue;

                // If cell only contains text, and that text is relatively long
                if (cell.childElementCount === 0 && cell.innerHTML.length > 200) {
                    cell.style.maxWidth = "30vw";
                }

                // Null and empty cells don't count, or a single null would make an `int?` column non-numeric.
                if (!isCollection || ResultControls.containsNullOrIsEmpty(cell)) continue;

                const stillNumeric = numericColumns.get(index) ?? true;
                numericColumns.set(index, stillNumeric && cell.classList.contains("numeric"));
            }
        }

        if (!isCollection) return;

        for (const [index, numeric] of numericColumns) {
            if (!numeric) continue;

            for (const row of Array.from(table.querySelectorAll(":scope > tbody > tr"))) {
                row.children[index]?.classList.add("numeric-column");
            }

            table.querySelector(":scope > thead > tr.table-data-header")
                ?.children[index]?.classList.add("numeric-column");
        }
    }

    private static containsNullOrIsEmpty(cell: HTMLTableCellElement): boolean {
        if (cell.childElementCount === 0) {
            return !cell.textContent?.trim();
        }

        return cell.children.length === 1 && cell.children[0].classList.contains("null");
    }

    public expand(table: HTMLTableElement) {
        table.classList.remove("collapsed");
        this.placeCaret(table);
    }

    public collapse(table: HTMLTableElement) {
        table.classList.add("collapsed");
        this.placeCaret(table);
    }

    public toggle(table: HTMLTableElement) {
        if (table.classList.contains("collapsed"))
            this.expand(table);
        else
            this.collapse(table);
    }

    private placeCaret(table: HTMLTableElement) {
        const typeLine = ResultControls.typeLine(table);
        const titledGroup = table.parentElement?.closest(".group.titled");
        const host = titledGroup && ResultControls.titledTable(titledGroup) === table
            ? titledGroup.querySelector(":scope > .title")
            : typeLine?.type ?? this.getTableCollapseTarget(table);
        if (!host) return;

        const icon: IconName = table.classList.contains("collapsed") ? "chevron-right" : "chevron-down";
        const caret = createIconElement(icon);
        if (!caret) return;

        caret.classList.add("dump-caret");

        const existing = host.querySelector(":scope > .dump-caret");
        if (existing) existing.replaceWith(caret);
        else host.prepend(caret);
    }

    /**
     * Returns a table's type-line row and the group in it that holds the caret, the type and the
     * item count, building them on first use.
     */
    public static typeLine(table: HTMLTableElement): { row: Element, type: Element } | null {
        const cell = table.querySelector(":scope > thead > tr.table-info-header > th");
        if (!cell) return null;

        const existing = cell.querySelector(":scope > .dump-type-line");
        if (existing) return {row: existing, type: existing.querySelector(":scope > .dump-type")!};

        const row = document.createElement("div");
        row.className = "dump-type-line";
        const type = document.createElement("span");
        type.className = "dump-type";

        const stamps = Array.from(cell.querySelectorAll(":scope > .dump-elapsed"));
        type.append(...Array.from(cell.childNodes).filter(node => !stamps.includes(node as Element)));
        row.append(type, ...stamps);
        cell.append(row);

        return {row, type};
    }

    private static titledTable(titledGroup: Element): HTMLTableElement | null {
        return titledGroup.querySelector(":scope > table");
    }

    private getTableCollapseTarget(table: HTMLTableElement): Element | null {
        let collapseTarget = table.querySelector(":scope > thead > tr.table-info-header > th");
        if (!collapseTarget)
            collapseTarget = table.querySelector(":scope > thead > tr > th");

        return collapseTarget;
    }

    private addBarGraphControls(table: HTMLTableElement) {
        const headerRow = this.getTableDataHeaderRow(table);
        if (!headerRow) {
            return;
        }

        const headers = Array.from(headerRow.cells).filter((cell): cell is HTMLTableCellElement => cell instanceof HTMLTableCellElement);
        for (const [columnIndex, header] of headers.entries()) {
            if (header.getAttribute(ResultControls.barGraphHeaderAttr) !== "true") {
                continue;
            }

            const existingButton = header.querySelector(":scope > .bar-graph-toggle");
            const button = existingButton instanceof SVGElement ? existingButton : createIconElement("bar-graph");
            if (!button) {
                continue;
            }

            button.classList.add("bar-graph-toggle");
            button.setAttribute("title", "Toggle bar graph");
            button.tabIndex = 0;

            const toggle = () => {
                const active = button.classList.toggle("active");
                header.classList.toggle("bar-graph-active", active);
                this.toggleBarGraphColumn(table, columnIndex, active);
            };

            const clickHandler = (e: Event) => {
                e.stopPropagation();
                toggle();
            };

            const keyDownHandler = (e: KeyboardEvent) => {
                if (e.key !== "Enter" && e.key !== " ") {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                toggle();
            };

            button.addEventListener("click", clickHandler);
            button.addEventListener("keydown", keyDownHandler);
            this.addDisposable(() => {
                button.removeEventListener("click", clickHandler);
                button.removeEventListener("keydown", keyDownHandler);
            });

            if (!button.parentElement) {
                header.appendChild(button);
            }
        }
    }

    private toggleBarGraphColumn(table: HTMLTableElement, columnIndex: number, show: boolean) {
        const cells = this.getDirectBodyCells(table, columnIndex);
        if (!cells.length) {
            return;
        }

        if (!show) {
            for (const cell of cells) {
                cell.classList.remove("bar-graph-cell");
                cell.classList.remove("bar-graph-negative");
                cell.querySelector(":scope > .bar-graph-track")?.remove();
            }

            return;
        }

        const numericCells = cells
            .map(cell => ({
                cell,
                value: Number(cell.getAttribute(ResultControls.barGraphValueAttr))
            }))
            .filter((entry) => !Number.isNaN(entry.value));

        if (!numericCells.length) {
            return;
        }

        const maxValue = Math.max(numericCells.reduce((max, current) => Math.max(max, Math.abs(current.value)), 0), 1);

        for (const {cell, value} of numericCells) {
            cell.classList.add("bar-graph-cell");
            cell.classList.toggle("bar-graph-negative", value < 0);
            this.ensureBarGraphValueWrapper(cell);

            const track = cell.querySelector(":scope > .bar-graph-track") ?? document.createElement("span");
            const fill = track.firstElementChild ?? document.createElement("span");

            track.classList.add("bar-graph-track");
            fill.classList.add("bar-graph-fill");
            fill.setAttribute("style", `width:${(Math.abs(value) / maxValue) * 100}%`);

            if (!fill.parentElement) {
                track.appendChild(fill);
            }

            if (!track.parentElement) {
                cell.prepend(track);
            }
        }
    }

    private getTableDataHeaderRow(table: HTMLTableElement): HTMLTableRowElement | null {
        if (!table.tHead || table.tHead.rows.length === 0) {
            return null;
        }

        for (let i = table.tHead.rows.length - 1; i >= 0; i--) {
            const row = table.tHead.rows[i];
            if (Array.from(row.cells).some(cell => cell.getAttribute(ResultControls.barGraphHeaderAttr) === "true")) {
                return row;
            }
        }

        return null;
    }

    private getDirectBodyCells(table: HTMLTableElement, columnIndex: number) {
        if (table.tBodies.length === 0) {
            return [] as HTMLTableCellElement[];
        }

        return Array.from(table.tBodies[0].rows)
            .map(row => row.cells.item(columnIndex))
            .filter((cell): cell is HTMLTableCellElement => cell instanceof HTMLTableCellElement);
    }

    private ensureBarGraphValueWrapper(cell: HTMLTableCellElement) {
        const existing = cell.querySelector(":scope > .bar-graph-value");
        if (existing) {
            return existing;
        }

        const wrapper = document.createElement("span");
        wrapper.classList.add("bar-graph-value");

        const nodes = Array.from(cell.childNodes).filter(node => !(node instanceof HTMLElement && node.classList.contains("bar-graph-track")));
        for (const node of nodes) {
            wrapper.appendChild(node);
        }

        cell.appendChild(wrapper);
        return wrapper;
    }

    public expandAll(level?: number) {
        if (!level) {
            this.querySelectorAll("table").forEach(t => this.expand(t as HTMLTableElement));
            this.querySelectorAll(".group.titled").forEach(t => t.classList.remove("collapsed"));
            return;
        }

        let selector = "";

        for (let iLevel = level; iLevel > 0; iLevel--) {
            selector += (!selector ? "" : ", ") + ".group > table";

            for (let iLevel2 = 1; iLevel2 < iLevel; iLevel2++) {
                selector += " > tbody > tr > td > table";
            }
        }

        this.resultsElement.querySelectorAll(selector).forEach(v => this.expand(v as HTMLTableElement));
    }

    public collapseAll(level?: number, root?: Element | DocumentFragment) {
        if (!root) root = this.resultsElement;

        if (!level) {
            root.querySelectorAll("table").forEach(t => this.collapse(t as HTMLTableElement));
            root.querySelectorAll(".group.titled").forEach(t => {
                if (!ResultControls.titledTable(t)) t.classList.add("collapsed");
            });
            return;
        }

        let selector = ".group > table";
        for (let iLevel = 1; iLevel <= level; iLevel++) {
            selector += " > tbody > tr > td > table";
        }

        selector += `, ${selector} table`;
        root.querySelectorAll(selector).forEach(v => this.collapse(v as HTMLTableElement));
    }

    private querySelectorAll(selectors: string) {
        return Array.from(this.resultsElement.querySelectorAll(selectors))
    }
}
