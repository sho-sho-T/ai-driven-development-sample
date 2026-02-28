import { describe, expect, it, vi } from "vitest";

import { createLogger, logger } from "./core";
import type { LogEntry, LogTransport } from "./types";

describe("logger", () => {
	describe("createLogger", () => {
		it("デフォルトのログレベルはinfoである", () => {
			const testLogger = createLogger();
			expect(testLogger.isLevelEnabled("debug")).toBe(false);
			expect(testLogger.isLevelEnabled("info")).toBe(true);
			expect(testLogger.isLevelEnabled("warn")).toBe(true);
			expect(testLogger.isLevelEnabled("error")).toBe(true);
		});

		it("ログレベルを指定できる", () => {
			const debugLogger = createLogger({ level: "debug" });
			expect(debugLogger.isLevelEnabled("debug")).toBe(true);

			const errorLogger = createLogger({ level: "error" });
			expect(errorLogger.isLevelEnabled("debug")).toBe(false);
			expect(errorLogger.isLevelEnabled("info")).toBe(false);
			expect(errorLogger.isLevelEnabled("warn")).toBe(false);
			expect(errorLogger.isLevelEnabled("error")).toBe(true);
		});

		it("カスタムTransportを指定できる", () => {
			const entries: LogEntry[] = [];
			const customTransport: LogTransport = (entry) => entries.push(entry);

			const testLogger = createLogger({
				level: "debug",
				transport: customTransport,
			});

			testLogger.info("test message", { key: "value" });

			expect(entries).toHaveLength(1);
			const entry = entries[0]!;
			expect(entry.level).toBe("info");
			expect(entry.message).toBe("test message");
			expect(entry.context).toEqual({ key: "value" });
			expect(entry.timestamp).toBeInstanceOf(Date);
		});

		it("ログレベル以下のログは出力されない", () => {
			const entries: LogEntry[] = [];
			const customTransport: LogTransport = (entry) => entries.push(entry);

			const testLogger = createLogger({
				level: "warn",
				transport: customTransport,
			});

			testLogger.debug("debug message");
			testLogger.info("info message");
			testLogger.warn("warn message");
			testLogger.error("error message");

			expect(entries).toHaveLength(2);
			expect(entries[0]!.level).toBe("warn");
			expect(entries[1]!.level).toBe("error");
		});
	});

	describe("child", () => {
		it("子Loggerにprefixが設定される", () => {
			const entries: LogEntry[] = [];
			const customTransport: LogTransport = (entry) => entries.push(entry);

			const parentLogger = createLogger({
				level: "info",
				transport: customTransport,
			});

			const childLogger = parentLogger.child("child");
			childLogger.info("child message");

			expect(entries[0]!.prefix).toBe("child");
		});

		it("ネストした子Loggerのprefixは:で連結される", () => {
			const entries: LogEntry[] = [];
			const customTransport: LogTransport = (entry) => entries.push(entry);

			const parentLogger = createLogger({
				level: "info",
				prefix: "parent",
				transport: customTransport,
			});

			const childLogger = parentLogger.child("child");
			const grandchildLogger = childLogger.child("grandchild");
			grandchildLogger.info("nested message");

			expect(entries[0]!.prefix).toBe("parent:child:grandchild");
		});

		it("子Loggerは親のログレベルを継承する", () => {
			const entries: LogEntry[] = [];
			const customTransport: LogTransport = (entry) => entries.push(entry);

			const parentLogger = createLogger({
				level: "error",
				transport: customTransport,
			});

			const childLogger = parentLogger.child("child");
			childLogger.info("should not appear");
			childLogger.error("should appear");

			expect(entries).toHaveLength(1);
			expect(entries[0]!.message).toBe("should appear");
		});
	});

	describe("default logger", () => {
		it("デフォルトのloggerインスタンスが存在する", () => {
			expect(logger).toBeDefined();
			expect(typeof logger.debug).toBe("function");
			expect(typeof logger.info).toBe("function");
			expect(typeof logger.warn).toBe("function");
			expect(typeof logger.error).toBe("function");
			expect(typeof logger.child).toBe("function");
			expect(typeof logger.isLevelEnabled).toBe("function");
		});
	});

	describe("console output", () => {
		it("JSON形式でconsoleに出力される", () => {
			const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

			const testLogger = createLogger({ level: "info" });
			testLogger.info("test message", { key: "value" });

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			const output = consoleSpy.mock.calls[0]![0] as string;
			const parsed = JSON.parse(output);

			expect(parsed.level).toBe("info");
			expect(parsed.message).toBe("test message");
			expect(parsed.context).toEqual({ key: "value" });
			expect(parsed.timestamp).toBeDefined();

			consoleSpy.mockRestore();
		});

		it("contextにErrorオブジェクトがある場合はシリアライズされる", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const testLogger = createLogger({ level: "info" });
			const error = new Error("Something went wrong");
			error.name = "ValidationError";
			testLogger.error("operation failed", { error });

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			const output = consoleSpy.mock.calls[0]![0] as string;
			const parsed = JSON.parse(output);

			expect(parsed.context.error.name).toBe("ValidationError");
			expect(parsed.context.error.message).toBe("Something went wrong");
			expect(parsed.context.error.stack).toBeDefined();

			consoleSpy.mockRestore();
		});

		it("ネストしたErrorオブジェクトもシリアライズされる", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const testLogger = createLogger({ level: "info" });
			const cause = new Error("Root cause");
			const error = new Error("Wrapper error", { cause });
			testLogger.error("operation failed", { error });

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			const output = consoleSpy.mock.calls[0]![0] as string;
			const parsed = JSON.parse(output);

			expect(parsed.context.error.message).toBe("Wrapper error");
			expect(parsed.context.error.cause.message).toBe("Root cause");
			expect(parsed.context.error.cause.stack).toBeDefined();

			consoleSpy.mockRestore();
		});

		it("深くネストしたError.causeも再帰的にシリアライズされる", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const testLogger = createLogger({ level: "info" });
			const rootCause = new Error("Root cause");
			const middleCause = new Error("Middle cause", { cause: rootCause });
			const error = new Error("Top error", { cause: middleCause });
			testLogger.error("deeply nested", { error });

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			const output = consoleSpy.mock.calls[0]![0] as string;
			const parsed = JSON.parse(output);

			expect(parsed.context.error.message).toBe("Top error");
			expect(parsed.context.error.cause.message).toBe("Middle cause");
			expect(parsed.context.error.cause.cause.message).toBe("Root cause");
			expect(parsed.context.error.cause.cause.stack).toBeDefined();

			consoleSpy.mockRestore();
		});

		it("Error.causeがError以外の場合もシリアライズされる", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const testLogger = createLogger({ level: "info" });
			const error = new Error("Error with string cause", {
				cause: "string cause",
			});
			testLogger.error("non-error cause", { error });

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			const output = consoleSpy.mock.calls[0]![0] as string;
			const parsed = JSON.parse(output);

			expect(parsed.context.error.message).toBe("Error with string cause");
			expect(parsed.context.error.cause).toBe("string cause");

			consoleSpy.mockRestore();
		});

		it("配列内のErrorオブジェクトもシリアライズされる", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const testLogger = createLogger({ level: "info" });
			const errors = [new Error("Error 1"), new Error("Error 2")];
			testLogger.error("multiple errors", { errors });

			expect(consoleSpy).toHaveBeenCalledTimes(1);
			const output = consoleSpy.mock.calls[0]![0] as string;
			const parsed = JSON.parse(output);

			expect(parsed.context.errors).toHaveLength(2);
			expect(parsed.context.errors[0].message).toBe("Error 1");
			expect(parsed.context.errors[1].message).toBe("Error 2");

			consoleSpy.mockRestore();
		});

		it("各ログレベルで適切なconsoleメソッドが呼ばれる", () => {
			const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
			const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const testLogger = createLogger({ level: "debug" });

			testLogger.debug("debug");
			testLogger.info("info");
			testLogger.warn("warn");
			testLogger.error("error");

			expect(debugSpy).toHaveBeenCalledTimes(1);
			expect(infoSpy).toHaveBeenCalledTimes(1);
			expect(warnSpy).toHaveBeenCalledTimes(1);
			expect(errorSpy).toHaveBeenCalledTimes(1);

			debugSpy.mockRestore();
			infoSpy.mockRestore();
			warnSpy.mockRestore();
			errorSpy.mockRestore();
		});
	});
});
