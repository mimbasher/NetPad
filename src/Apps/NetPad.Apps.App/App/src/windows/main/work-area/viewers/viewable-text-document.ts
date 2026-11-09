import {ViewableObject} from "./viewable-object";
import {TextLanguage} from "@application/editor/text-language";
import {TextDocument} from "@application/editor/text-document";

export abstract class ViewableTextDocument extends ViewableObject {
    private readonly _name: string;
    private readonly _initialText: string;
    public readonly textDocument: TextDocument;

    protected constructor(
        id: string,
        name: string,
        language: TextLanguage,
        initialText: string,
    ) {
        super(id);
        this._name = name;
        this._initialText = initialText;
        this.textDocument = new TextDocument(id, language, initialText);
        this.addDisposable(this.textDocument);
    }

    public get name() {
        return this._name;
    }

    public get isDirty() {
        return this._initialText !== this.textDocument.text;
    }
}
