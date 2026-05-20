@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ======================================
echo 项目初始化和启动 (适配 Prisma 7)
echo ======================================
echo.

REM 1. 检查 Node.js 和 npm
echo 1. 检查依赖...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Node.js 未安装
    echo 请访问 https://nodejs.org/ 下载安装
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION%

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ npm 未安装
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm %NPM_VERSION%
echo.

REM 2. 检查并创建 .env 文件
echo 2. 检查环境配置...
if not exist ".env" (
    echo ! .env 文件不存在，正在创建...
    
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ✓ 已从 .env.example 创建 .env 文件
    ) else (
        echo DATABASE_URL="file:./dev.db"> .env
        echo EXECUTOR_URL="http://localhost:8001">> .env
        echo NODE_ENV="development">> .env
        echo ✓ 已创建默认 .env 文件
    )
) else (
    echo ✓ .env 文件已存在
)
echo.

REM 3. 安装 Prisma 7 必要依赖
echo 3. 安装 Prisma 7 依赖...
npm install prisma @prisma/client
npm install @prisma/adapter-better-sqlite3 better-sqlite3
echo.

REM 4. 创建 prisma.config.ts 文件
echo 4. 配置 Prisma 7...
if not exist "prisma.config.ts" (
    echo 创建 prisma.config.ts 文件...
    echo import 'dotenv/config' > prisma.config.ts
    echo import { defineConfig, env } from "prisma/config" >> prisma.config.ts
    echo. >> prisma.config.ts
    echo export default defineConfig({ >> prisma.config.ts
    echo   schema: 'prisma/schema.prisma', >> prisma.config.ts
    echo   migrations: { >> prisma.config.ts
    echo     path: 'prisma/migrations', >> prisma.config.ts
    echo   }, >> prisma.config.ts
    echo   datasource: { >> prisma.config.ts
    echo     url: env("DATABASE_URL") >> prisma.config.ts
    echo   } >> prisma.config.ts
    echo }); >> prisma.config.ts
    echo ✓ prisma.config.ts 创建完成
) else (
    echo ✓ prisma.config.ts 已存在
)

REM 5. 修复 schema.prisma 文件
echo 修复 schema.prisma 文件...
if exist "prisma\schema.prisma" (
    powershell -Command "(Get-Content 'prisma\schema.prisma') | Where-Object { $_ -notmatch 'url\\s*=' } | Set-Content 'prisma\schema.prisma'"
    echo ✓ schema.prisma 修复完成
)
echo.

REM 6. 安装项目依赖
echo 6. 安装项目依赖...
if not exist "node_modules" (
    echo 正在安装 npm 依赖...
    npm install
    if !errorlevel! equ 0 (
        echo ✓ npm 依赖安装完成
    ) else (
        echo ✗ npm 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo ✓ npm 依赖已安装
)
echo.

REM 7. 检查数据库
echo 7. 检查数据库...
set DB_CREATED=false

if not exist "prisma\dev.db" (
    echo ! 数据库不存在，正在初始化...
    
    echo 生成 Prisma 客户端...
    npx prisma generate
    
    echo 执行数据库迁移...
    npx prisma migrate dev --name init
    if !errorlevel! equ 0 (
        echo ✓ 数据库迁移执行成功
        set DB_CREATED=true
    ) else (
        echo ✗ 数据库迁移失败
        echo 请检查 prisma.config.ts 和 schema.prisma 文件配置
        pause
        exit /b 1
    )
    
    timeout /t 1 /nobreak >nul
    
    if exist "prisma\dev.db" (
        echo ✓ 数据库文件已创建
    ) else (
        echo ⚠ 注意: 数据库文件未找到，但迁移已执行
    )
) else (
    echo ✓ 数据库已存在
    echo 检查数据库迁移...
    npx prisma migrate status
)
echo.

REM 8. 初始化数据（如果是新数据库）
if "!DB_CREATED!"=="true" (
    echo 8. 初始化数据...
    
    if exist "scripts\init-admin.js" (
        echo → 创建管理员账号...
        node scripts\init-admin.js
        if !errorlevel! equ 0 (
            echo   ✓ 管理员账号初始化完成
        ) else (
            echo   ⚠ 管理员账号初始化失败
        )
    )
    
    if exist "scripts\init-sample-data.js" (
        echo → 导入示例数据...
        node scripts\init-sample-data.js
        if !errorlevel! equ 0 (
            echo   ✓ 示例数据导入完成
        ) else (
            echo   ⚠ 示例数据导入失败
        )
    )
    echo.
)

REM 9. 构建项目
echo 9. 构建 Next.js 项目...
npm run build
if !errorlevel! equ 0 (
    echo ✓ Next.js 构建完成
) else (
    echo ✗ Next.js 构建失败
    pause
    exit /b 1
)
echo.

REM 10. 完成提示
echo ======================================
echo 初始化完成！
echo ======================================
echo.
echo 启动服务：
echo  终端1: npm run start
echo  终端2: cd executor && python main.py
echo.
echo 访问地址：
echo  前端: http://localhost:3009
echo  API: http://192.168.10.113:18015/docs
echo.

pause