import { describe, expect, test } from "bun:test";
import { Info } from "../src/openmetrics-client";

describe("Info", () => {
	test("should create info metric with static value", () => {
		const info = new Info({
			name: "version",
			help: "Service version",
			labelNames: ["version"],
		});
		info.set({ version: "1.0.0" });
		const output = info.getMetric();
		expect(output).toInclude('version_info{version="1.0.0"} 1');
	});

	describe("Info Labels", () => {
		test("should track multiple info metrics with labels", () => {
			const info = new Info({
				name: "build_info",
				help: "Build information",
				labelNames: ["version", "commit"],
			});

			info.labels({ version: "1.0.0", commit: "abc123" }).set();
			info.labels({ version: "2.0.0", commit: "def456" }).set();

			const output = info.getMetric();
			expect(output).toInclude('build_info_info{commit="abc123",version="1.0.0"} 1');
			expect(output).toInclude('build_info_info{commit="def456",version="2.0.0"} 1');
		});
	});
});
