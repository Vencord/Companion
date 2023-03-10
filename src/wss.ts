import { RawData, WebSocket, WebSocketServer } from "ws";
import { outputChannel } from "./shared";

export let wss: WebSocketServer;

export const sockets = new Set<WebSocket>();

const enum CloseCode {
    POLICY_VIOLATION = 1008
}

let nonceCounter = 8485;

export async function sendToSockets(data: { type: string, data: unknown; }) {
    if (sockets.size === 0) {
        throw new Error("No Discord Clients Connected! Make sure you have Discord opened and be using a DEV build of Vencord");
    }

    const nonce = nonceCounter++;
    (data as any).nonce = nonce;

    const promises = Array.from(sockets, sock => new Promise<void>((resolve, reject) => {
        const onMessage = (data: RawData) => {
            const msg = data.toString("utf-8");
            try {
                var parsed = JSON.parse(msg);
            } catch (err) {
                return reject("Got Invalid Response: " + msg);
            }

            if (parsed.nonce !== nonce) return;

            cleanup();

            if (parsed.message !== "OK") {
                reject(parsed.message);
            } else {
                resolve();
            }
        };

        const onError = (err: Error) => {
            cleanup();
            reject(err);
        };

        const cleanup = () => {
            sock.off("message", onMessage);
            sock.off("error", onError);
        };

        sock.on("message", onMessage);
        sock.once("error", onError);

        setTimeout(() => {
            cleanup();
            reject("Timed out");
        }, 5000);

        sock.send(JSON.stringify(data));
    }));

    await Promise.all(promises);
    return true;
}

export function startWss() {
    wss = new WebSocketServer({
        port: 8485
    });

    wss.on("connection", (sock, req) => {
        if (req.headers.origin) {
            try {
                switch (new URL(req.headers.origin).hostname) {
                    case "discord.com":
                    case "canary.discord.com":
                    case "ptb.discord.com":
                        break;
                    default:
                        throw "a party";
                }
            } catch {
                outputChannel.appendLine(`[WS] Rejected request from invalid or disallowed origin: ${req.headers.origin}`);
                sock.close(CloseCode.POLICY_VIOLATION, "Invalid or disallowed origin");
                return;
            }
        }

        outputChannel.appendLine(`[WS] New Connection (Origin: ${req.headers.origin || "-"})`);
        sockets.add(sock);

        sock.on("close", () => {
            outputChannel.appendLine("[WS] Connection Closed");
            sockets.delete(sock);
        });

        sock.on("message", msg => {
            outputChannel.appendLine(`[WS] RECV: ${msg}`);
        });

        sock.on("error", err => {
            console.error("[Vencord Companion WS", err);
            outputChannel.appendLine(`[WS] Error: ${err}`);
        });

        const originalSend = sock.send;
        sock.send = function (data) {
            outputChannel.appendLine(`[WS] SEND: ${data}`);
            // @ts-ignore "Expected 3-4 arguments but got 2?????" No bestie it expects 2-3....
            originalSend.call(this, data);
        };

        console.log(sock);
    });

    wss.on("error", err => {
        console.error("[Vencord Companion WS", err);
        outputChannel.appendLine(`[WS] Error: ${err}`);
    });

    wss.once("listening", () => {
        outputChannel.appendLine("[WS] Listening on port 8485");
    });

    wss.on("close", () => {
        outputChannel.appendLine("[WS] Closed");
    });
}
