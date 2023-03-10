import { isIdentifier, ObjectLiteralElementLike } from "typescript";

export function hasName(node: ObjectLiteralElementLike, name: string) {
    return node.name && isIdentifier(node.name) && node.name.text === name;
}

export interface ParseResult {
    type: string;
    value: unknown;
}

export interface PatchData {
    find: string;
    replacement: Record<"match" | "replace", ParseResult>[];
}

export interface FindData {
    type: string;
    args: string[];
}

export function isNotNull<T>(value: T): value is Exclude<T, null | undefined> {
    return value != null;
}
