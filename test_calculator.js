
// 模擬計算邏輯的單元測試腳本
const assert = require('assert');

function calculate(first, second, op) {
    if (op === '/' && second === 0) return "Error";
    if (op === '+') return first + second;
    if (op === '-') return first - second;
    if (op === '*') return first * second;
    if (op === '/') return first / second;
    return null;
}

console.log("🚀 開始執行單元測試...");

try {
    // Test 1: Addition
    console.log("測試 1: 加法 (5 + 3)...");
    assert.strictEqual(calculate(5, 3, '+'), 8);

    // Test 2: Division (Normal)
    console.log("測試 2: 除法 (10 / 2)...");
    assert.strictEqual(calculate(10, 2, '/'), 5);

    // Test 3: Division (By Zero) - 這是原本失敗的地方
    console.log("測試 3: 除以零 (10 / 0)...");
    assert.strictEqual(calculate(10, 0, '/'), "Error");

    console.log("✅ 所有測試通過！");
} catch (err) {
    console.error("❌ 測試失敗！");
    console.error(err.message);
    process.exit(1);
}
