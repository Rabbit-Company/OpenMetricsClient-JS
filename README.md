# OpenMetrics-Compatible Metrics Library

[![JSR](https://jsr.io/badges/@rabbit-company/openmetrics-client)](https://jsr.io/@rabbit-company/openmetrics-client)
[![npm version](https://img.shields.io/npm/v/@rabbit-company/openmetrics-client)](https://www.npmjs.com/package/@rabbit-company/openmetrics-client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

A production-ready, type-safe implementation of OpenMetrics standard for Node.js / Deno / Bun applications with zero dependencies.

## Features

- **100% OpenMetrics Compliance** - Fully implements [OpenMetrics specification](https://openmetrics.io/) with proper content-type headers
- **TypeScript First** - Complete type definitions and generics support
- **Comprehensive Metric Types**:
  - 🔢 **Counters** - Monotonically increasing values
  - 📊 **Gauges** - Arbitrary up/down values
  - ⏱️ **Histograms** - Bucketed observations with configurable buckets
  - 📈 **Summaries** - Sliding window quantiles
  - ℹ️ **Info** - Static metadata (always value=1)
  - 🗂️ **StateSets** - Mutually exclusive states (like enums)
  - ❓ **Unknown** - Special cases (use sparingly)
- **Automatic Registry Management** - Optional auto-registration
- **Label Support** - Multi-dimensional metrics with proper escaping
- **Time-Based Windowing** - Configurable observation windows for summaries

## Installation

```bash
npm install @rabbit-company/openmetrics-client
# or
yarn add @rabbit-company/openmetrics-client
```

## Quick Start

```js
import { Registry, Counter, Gauge, Histogram } from "@rabbit-company/openmetrics-client";

// 1. Create registry (singleton recommended)
const registry = new Registry({
	prefix: "myapp", // Optional metric prefix
});

// 2. Define metrics
const httpRequests = new Counter({
	name: "http_requests_total",
	help: "Total HTTP requests",
	labelNames: ["method", "status"],
	registry,
});

const tempGauge = new Gauge({
	name: "temperature_celsius",
	help: "Current temperature",
	unit: "celsius",
	labelNames: ["location"],
	registry,
});

// 3. Record metrics
httpRequests.labels({ method: "GET", status: "200" }).inc();
tempGauge.labels({ location: "server_room" }).set(23.5);

// 4. Expose metrics endpoint
import express from "express";
const app = express();

app.get("/metrics", (req, res) => {
	res.set("Content-Type", Registry.contentType).send(registry.metricsText());
});

app.listen(8080);
```

## Metric Types Guide

### 📈 Counter (monotonically increasing)

```js
const counter = new Counter({
	name: "login_attempts_total",
	help: "Total user login attempts",
	labelNames: ["result"], // Optional labels
	registry,
});

// Usage:
counter.labels({ result: "success" }).inc(); // +1
counter.labels({ result: "success" }).inc(5); // +5
```

### 🔢 Gauge (arbitrary values)

```js
const gauge = new Gauge({
	name: "memory_usage_bytes",
	help: "Current memory usage",
	unit: "bytes", // Recommended for units
	registry,
});

// Usage:
gauge.set(512 * 1024 * 1024); // Absolute value
gauge.inc(100); // Increase
gauge.dec(50); // Decrease
```

### ⏱️ Histogram (bucketed observations)

```js
const histogram = new Histogram({
	name: "http_request_duration_seconds",
	help: "Request duration distribution",
	buckets: [0.1, 0.5, 1, 2.5, 5, 10], // Custom buckets
	registry,
});

// Usage:
histogram.observe(1.23); // Record duration
```

### ⚖️ GaugeHistogram (current distribution)

```js
const requestSizes = new GaugeHistogram({
	name: "http_request_size_bytes",
	help: "Current request size distribution",
	buckets: [100, 500, 1000, 5000],
	unit: "bytes",
	registry,
});

requestSizes.observe(450); // Falls in 500 bucket
requestSizes.observe(1200); // Falls in 5000 bucket
```

### 📊 Summary (quantiles over sliding window)

```js
const summary = new Summary({
	name: "database_query_duration",
	help: "Query performance quantiles",
	quantiles: [0.5, 0.9, 0.99], // Default quantiles
	maxAgeSeconds: 300, // 5 minute window
	ageBuckets: 5, // Number of buckets
	registry,
});

// Usage:
summary.observe(0.42);
```

### 🗂️ StateSet (mutually exclusive states)

```js
const serviceState = new StateSet({
	name: "service_status",
	help: "Current service state",
	states: ["starting", "running", "degraded", "stopped"],
	labelNames: ["instance"], // Optional labels
	registry,
});

// Usage:
serviceState.labels({ instance: "api-1" }).enableOnly("running");
```

### ℹ️ Info (static metadata)

```js
const buildInfo = new Info({
	name: "build_info",
	help: "Build information",
	labelNames: ["version", "commit", "env"],
	registry,
});

buildInfo
	.labels({
		version: "1.2.3",
		commit: "abc123",
		env: process.env.NODE_ENV,
	})
	.set();
```

### ❓ Unknown (special cases)

```js
const specialMetric = new Unknown({
	name: "custom_metric",
	help: "Special non-standard metric",
	registry,
});

specialMetric.set(42);
```
