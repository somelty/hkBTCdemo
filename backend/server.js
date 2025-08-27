const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors"); // 新增CORS模块
const app = express();

// 中间件
app.use(cors()); // 启用跨域支持
app.options("*", cors()); // 处理预检请求，避免OPTIONS 404
app.use(fileUpload());
app.use(express.json()); // 解析JSON请求体

// 健康检查
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// AI 验证接口（模拟）
app.post("/validate", (req, res) => {
  const risk = Math.floor(Math.random() * 40) + 60; // 模拟AI评分 60-99
  const trustSummary = "Document appears valid. Issuer matches registry.";

  res.json({
    risk_score: risk,
    trust_summary: trustSummary,
  });
});

// ChainRank 评分接口（模拟）
app.post("/chainrank", (req, res) => {
  const riskScore = Number(req.body?.risk_score || 0);
  // 简单权重与规则
  let chainrank = riskScore * 1.0;
  const decision = chainrank >= 60 ? "APPROVED" : "REJECTED";
  res.json({
    chainrank: Number(chainrank.toFixed(1)),
    decision,
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log("API服务运行在 http://localhost:3000");
});
