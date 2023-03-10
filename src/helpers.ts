import { isIdentifier, ObjectLiteralElementLike } from "typescript";

export function hasName(node: ObjectLiteralElementLike, name: string) {
    return node.name && isIdentifier(node.name) && node.name.text === name;
}

export interface ParseResult {
    type: string;
    value: unknown;
}
