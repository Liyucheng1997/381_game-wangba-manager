@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 网管日记 2006
if not exist node_modules (
  echo 首次运行，正在安装依赖...
  call npm install
)
echo 游戏启动中，浏览器将自动打开 http://localhost:5173
call npm run dev -- --open
