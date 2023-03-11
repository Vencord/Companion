import { window } from "vscode";

export const outputChannel = window.createOutputChannel("Vencord Companion");

export interface StringNode {
    type: "string";
    value: string;
}

export interface RegexNode {
    type: "regex";
    value: {
        pattern: string;
        flags: string;
    };
}

export interface FunctionNode {
    type: "function";
    value: string;
}

export interface PatchData {
    find: string | null;
    replacement: {
        match: StringNode | RegexNode | null;
        replace: StringNode | FunctionNode;
    }[];
}

export interface FindData {
    type: string;
    args: Array<StringNode | FunctionNode>;
}

export const enum Mod {
    VENCORD,
    REPLUGGED
}
