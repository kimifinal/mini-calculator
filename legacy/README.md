# 舊版實作與測試 (遷移動前備份, 非破壞性保留)
# 這些是 pre-Vite 的手寫版本, 邏輯已併入 src/lib/calculator.ts (SSOT),
# 保留於此僅供比對 / 還原, 不納入建置。
#
# - legacy/index.html        舊單一檔 cinematic glass 版本 (Vue from CDN)
# - legacy/Calculator.vue    舊版組件 (無 lib, 邏輯內嵌)
# - legacy/validate_logic.py 舊版 Python 单元测试 (純函式)
# - legacy/test_calculator.js 舊版 Node 单元测试 (純函式)
