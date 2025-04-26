import { describe, expect, test } from "bun:test";
import { Gauge } from "../src/openmetrics-client";

describe("Unit Suffix Handling", () => {
	test("should append '_bytes' to name if unit is 'bytes' and name doesn't include it", () => {
		const gauge = new Gauge({
			name: "request_size",
			help: "Size of the request",
			unit: "bytes",
		});

		gauge.set(0);

		const output = gauge.getMetric();
		expect(output).toInclude("# TYPE request_size_bytes gauge");
		expect(output).toInclude("request_size_bytes 0");
	});
});
