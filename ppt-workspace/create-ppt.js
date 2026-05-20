const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pptxgen = require('pptxgenjs');
const html2pptx = require('C:\\Users\\dell\\.cursor\\skills\\pptx\\scripts\\html2pptx.js');

const SLIDES_DIR = path.join(__dirname, 'slides');
if (!fs.existsSync(SLIDES_DIR)) fs.mkdirSync(SLIDES_DIR, { recursive: true });

const C = {
  navy: '#0F172A',
  darkBlue: '#1E3A5F',
  blue: '#2563EB',
  sky: '#0EA5E9',
  teal: '#0D9488',
  emerald: '#10B981',
  amber: '#F59E0B',
  orange: '#F97316',
  red: '#EF4444',
  lightBg: '#F1F5F9',
  white: '#FFFFFF',
  textDark: '#1E293B',
  textGray: '#64748B',
  border: '#E2E8F0',
  cardBg: '#FFFFFF',
  accentLight: '#DBEAFE',
  accentTealLight: '#CCFBF1',
};

async function createGradient(filename, color1, color2, w = 960, h = 540, angle = '135') {
  const x2 = angle === '135' ? '100%' : (angle === '90' ? '100%' : '0%');
  const y2 = angle === '135' ? '100%' : (angle === '90' ? '0%' : '100%');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="${x2}" y2="${y2}">
      <stop offset="0%" style="stop-color:${color1}"/>
      <stop offset="100%" style="stop-color:${color2}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  const fp = path.join(SLIDES_DIR, filename);
  await sharp(Buffer.from(svg)).png().toFile(fp);
  return filename;
}

function writeSlide(name, html) {
  const fp = path.join(SLIDES_DIR, name);
  fs.writeFileSync(fp, html, 'utf-8');
  return fp;
}

const baseStyle = `
html { background: #ffffff; }
body {
  width: 720pt; height: 405pt; margin: 0; padding: 0;
  font-family: Arial, sans-serif;
  display: flex; flex-direction: column;
  overflow: hidden;
}
`;

function sectionHeader(num, title) {
  return `
  <div style="display:flex; align-items:center; margin:0 0 2pt 0;">
    <div style="background:${C.sky}; width:36pt; height:36pt; border-radius:50%; display:flex; align-items:center; justify-content:center;">
      <p style="color:#fff; font-size:18pt; font-weight:bold; margin:0; text-align:center;">${num}</p>
    </div>
    <p style="color:${C.textDark}; font-size:22pt; font-weight:bold; margin:0 0 0 12pt;">${title}</p>
  </div>`;
}

function pageIndicator(current, total) {
  return `<div style="position:absolute; bottom:8pt; right:20pt;">
    <p style="color:${C.textGray}; font-size:9pt; margin:0;">${current} / ${total}</p>
  </div>`;
}

// ==================== SLIDE 1: COVER ====================
function slide01_cover(bgImg) {
  return writeSlide('slide01.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body {
  background: ${C.navy};
  justify-content: center;
  align-items: center;
}
</style></head><body>
  <div style="display:flex; flex-direction:column; align-items:center;">
    <div style="background:rgba(255,255,255,0.15); border:2px solid rgba(255,255,255,0.3); border-radius:12pt; padding:30pt 60pt; display:flex; flex-direction:column; align-items:center;">
      <p style="color:#fff; font-size:36pt; font-weight:bold; margin:0 0 8pt 0; text-align:center;">API 智能测试平台</p>
      <p style="color:rgba(255,255,255,0.9); font-size:20pt; margin:0 0 18pt 0; text-align:center;">应用实践分享</p>
      <div style="background:${C.sky}; width:60pt; height:3pt; border-radius:2pt;"></div>
    </div>
    <p style="color:rgba(255,255,255,0.7); font-size:12pt; margin:20pt 0 0 0; text-align:center;">2025年度技术分享</p>
  </div>
</body></html>`);
}

// ==================== SLIDE 2: TOC ====================
function slide02_toc() {
  const items = [
    { n: '01', t: 'API自动化测试的痛点', c: C.red },
    { n: '02', t: 'API智能测试平台的价值', c: C.sky },
    { n: '03', t: '技术架构', c: C.blue },
    { n: '04', t: '主要功能介绍', c: C.teal },
    { n: '05', t: '应用实践', c: C.amber },
    { n: '06', t: '成效', c: C.emerald },
  ];
  const itemsHtml = items.map(i => `
    <div style="display:flex; align-items:center; margin:0 0 10pt 0;">
      <div style="background:${i.c}; width:36pt; height:36pt; border-radius:8pt; display:flex; align-items:center; justify-content:center;">
        <p style="color:#fff; font-size:16pt; font-weight:bold; margin:0; text-align:center;">${i.n}</p>
      </div>
      <p style="color:${C.textDark}; font-size:15pt; margin:0 0 0 12pt;">${i.t}</p>
    </div>
  `).join('');

  return writeSlide('slide02.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:20pt 36pt;">
    <p style="color:#fff; font-size:26pt; font-weight:bold; margin:0;">目录</p>
    <p style="color:rgba(255,255,255,0.6); font-size:11pt; margin:4pt 0 0 0;">CONTENTS</p>
  </div>
  <div style="padding:20pt 50pt 16pt 50pt; display:flex; flex-direction:column;">
    ${itemsHtml}
  </div>
  ${pageIndicator(2, 15)}
</body></html>`);
}

// ==================== SLIDE 3: 痛点 ====================
function slide03_pain() {
  const pains = [
    { icon: '!', title: '接口信息分散', desc: 'API文档散落各处,缺乏统一管理和维护' },
    { icon: '?', title: '用例编写效率低', desc: '手工编写测试用例耗时且容易遗漏边界场景' },
    { icon: '$', title: '测试维护成本高', desc: '接口变更导致大量用例需要同步更新' },
    { icon: '~', title: '缺乏智能化', desc: '传统工具无法自动分析和生成测试策略' },
    { icon: '&', title: '团队协作困难', desc: '测试资产难以在团队间共享和复用' },
    { icon: '#', title: '执行监控不足', desc: '缺乏实时执行状态跟踪和质量度量' },
  ];
  const cardsHtml = pains.map((p, i) => `
    <div style="background:${i % 2 === 0 ? '#FEF2F2' : '#FFF7ED'}; border-left:4pt solid ${i % 2 === 0 ? C.red : C.orange}; border-radius:6pt; padding:10pt 12pt; width:200pt;">
      <p style="color:${C.textDark}; font-size:13pt; font-weight:bold; margin:0 0 4pt 0;">${p.title}</p>
      <p style="color:${C.textGray}; font-size:10pt; margin:0; line-height:1.4;">${p.desc}</p>
    </div>
  `).join('');

  return writeSlide('slide03.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    ${sectionHeader('01', '<span style="color:#fff;">API自动化测试的痛点</span>')}
  </div>
  <div style="padding:18pt 36pt; display:flex; flex-wrap:wrap; gap:14pt; justify-content:center;">
    ${cardsHtml}
  </div>
  ${pageIndicator(3, 15)}
</body></html>`);
}

// ==================== SLIDE 4: 价值 ====================
function slide04_value() {
  const values = [
    { title: 'AI驱动', desc: '利用大模型智能生成测试用例,降低人工编写成本', color: C.blue },
    { title: '全流程覆盖', desc: '从API采集到测试报告的完整闭环', color: C.teal },
    { title: '可视化编排', desc: '拖拽式用例编排,降低使用门槛', color: C.sky },
    { title: '统一管理', desc: '四层分类体系,规范化API资产', color: C.emerald },
    { title: '高效协作', desc: '多用户支持,测试资产共享复用', color: C.amber },
    { title: '实时监控', desc: 'SSE实时推送执行日志,全程可观测', color: C.orange },
  ];
  const cardsHtml = values.map(v => `
    <div style="background:${C.white}; border:1px solid ${C.border}; border-radius:8pt; padding:14pt; width:195pt; border-top:3pt solid ${v.color};">
      <p style="color:${v.color}; font-size:14pt; font-weight:bold; margin:0 0 6pt 0;">${v.title}</p>
      <p style="color:${C.textGray}; font-size:10pt; margin:0; line-height:1.4;">${v.desc}</p>
    </div>
  `).join('');

  return writeSlide('slide04.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.lightBg}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    ${sectionHeader('02', '<span style="color:#fff;">API智能测试平台的价值</span>')}
  </div>
  <div style="padding:20pt 36pt; display:flex; flex-wrap:wrap; gap:14pt; justify-content:center;">
    ${cardsHtml}
  </div>
  ${pageIndicator(4, 15)}
</body></html>`);
}

// ==================== SLIDE 5: 技术架构 ====================
function slide05_arch() {
  const layers = [
    { name: '前端展示层', tech: 'Next.js 16 + React 19 + Tailwind CSS + Radix UI + React Flow', color: C.blue, bg: '#DBEAFE' },
    { name: '业务逻辑层', tech: 'Next.js API Routes + next-intl + TanStack Query + Zod', color: C.teal, bg: '#CCFBF1' },
    { name: 'AI 引擎层', tech: 'OpenAI / DeepSeek / Claude / Ollama + Function Calling', color: C.amber, bg: '#FEF3C7' },
    { name: '测试执行层', tech: 'Python FastAPI + 变量管理 + 定时调度 + 套件执行器', color: C.orange, bg: '#FFEDD5' },
    { name: '数据存储层', tech: 'SQLite + Prisma ORM + 15+ 数据模型', color: C.emerald, bg: '#D1FAE5' },
  ];
  const layersHtml = layers.map(l => `
    <div style="display:flex; align-items:center; margin:0 0 10pt 0;">
      <div style="background:${l.color}; width:120pt; padding:10pt; border-radius:6pt 0 0 6pt; display:flex; align-items:center; justify-content:center;">
        <p style="color:#fff; font-size:12pt; font-weight:bold; margin:0; text-align:center;">${l.name}</p>
      </div>
      <div style="background:${l.bg}; padding:10pt 14pt; border-radius:0 6pt 6pt 0; width:510pt; border:1px solid ${l.color}30;">
        <p style="color:${C.textDark}; font-size:10pt; margin:0;">${l.tech}</p>
      </div>
    </div>
  `).join('');

  return writeSlide('slide05.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    ${sectionHeader('03', '<span style="color:#fff;">技术架构</span>')}
  </div>
  <div style="padding:18pt 36pt; display:flex; flex-direction:column; align-items:center;">
    ${layersHtml}
  </div>
  ${pageIndicator(5, 15)}
</body></html>`);
}

// ==================== SLIDE 6: 功能总览 ====================
function slide06_features() {
  const features = [
    { name: 'API 采集', desc: '浏览器录制/代理/HAR导入', color: C.blue, bg: '#EFF6FF' },
    { name: 'API 仓库', desc: '四层分类/标签/搜索', color: C.teal, bg: '#F0FDFA' },
    { name: 'AI 智能生成', desc: '对话式AI用例生成', color: C.amber, bg: '#FFFBEB' },
    { name: '用例编排', desc: '可视化流程画布编排', color: C.sky, bg: '#F0F9FF' },
    { name: '测试套件', desc: '套件管理/定时调度', color: C.emerald, bg: '#ECFDF5' },
    { name: '执行监控', desc: '实时日志/报告/统计', color: C.orange, bg: '#FFF7ED' },
  ];
  const grid = features.map(f => `
    <div style="background:${f.bg}; border:1px solid ${f.color}30; border-radius:8pt; padding:10pt; width:195pt; display:flex; flex-direction:column; align-items:center;">
      <div style="background:${f.color}; width:30pt; height:30pt; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 0 6pt 0;">
        <p style="color:#fff; font-size:14pt; font-weight:bold; margin:0; text-align:center;">A</p>
      </div>
      <p style="color:${C.textDark}; font-size:12pt; font-weight:bold; margin:0 0 2pt 0; text-align:center;">${f.name}</p>
      <p style="color:${C.textGray}; font-size:9pt; margin:0; text-align:center;">${f.desc}</p>
    </div>
  `).join('');

  return writeSlide('slide06.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    ${sectionHeader('04', '<span style="color:#fff;">主要功能介绍</span>')}
  </div>
  <div style="padding:10pt 36pt; display:flex; flex-wrap:wrap; gap:10pt; justify-content:center;">
    ${grid}
  </div>
  ${pageIndicator(6, 15)}
</body></html>`);
}

// ==================== SLIDE 7: API采集 ====================
function slide07_capture() {
  const methods = [
    { title: '浏览器录制', desc: '基于 Playwright Chromium 内核,启动浏览器实时捕获API请求,支持暂停/恢复/SSE流式推送', color: C.blue },
    { title: '代理录制', desc: 'HTTP代理模式,配置代理地址后自动捕获经过代理的所有API请求', color: C.teal },
    { title: 'Mitmproxy录制', desc: '中间人代理方式,支持 HTTPS 解密和录制,适用于移动端测试场景', color: C.emerald },
    { title: 'HAR文件导入', desc: '支持从浏览器开发者工具导出的 HAR 文件批量导入,自动解析和路径参数化', color: C.amber },
  ];
  const itemsHtml = methods.map(m => `
    <div style="display:flex; margin:0 0 12pt 0;">
      <div style="background:${m.color}; width:5pt; border-radius:3pt; margin:0 10pt 0 0;"></div>
      <div style="width:620pt;">
        <p style="color:${C.textDark}; font-size:13pt; font-weight:bold; margin:0 0 3pt 0;">${m.title}</p>
        <p style="color:${C.textGray}; font-size:10pt; margin:0; line-height:1.3;">${m.desc}</p>
      </div>
    </div>
  `).join('');

  return writeSlide('slide07.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    <p style="color:rgba(255,255,255,0.5); font-size:10pt; margin:0 0 4pt 0;">04 主要功能介绍</p>
    <p style="color:#fff; font-size:22pt; font-weight:bold; margin:0;">API 采集 - 多模式接口录制</p>
  </div>
  <div style="padding:20pt 42pt;">
    ${itemsHtml}
    <div style="background:${C.lightBg}; border-radius:8pt; padding:12pt 16pt; margin:6pt 0 0 0;">
      <p style="color:${C.textDark}; font-size:10pt; margin:0;"><b>核心能力:</b> 智能去重检测 | Header过滤配置 | 路径参数自动识别 | 批量保存至API仓库 | 冲突解决策略</p>
    </div>
  </div>
  ${pageIndicator(7, 15)}
</body></html>`);
}

// ==================== SLIDE 8: API仓库 ====================
function slide08_repo() {
  return writeSlide('slide08.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    <p style="color:rgba(255,255,255,0.5); font-size:10pt; margin:0 0 4pt 0;">04 主要功能介绍</p>
    <p style="color:#fff; font-size:22pt; font-weight:bold; margin:0;">API 仓库 - 四层分类管理体系</p>
  </div>
  <div style="display:flex; padding:16pt 36pt; gap:16pt;">
    <div style="width:300pt;">
      <p style="color:${C.textDark}; font-size:14pt; font-weight:bold; margin:0 0 12pt 0;">四层分类架构</p>
      <div style="display:flex; flex-direction:column; gap:8pt;">
        <div style="background:#DBEAFE; border-left:4pt solid ${C.blue}; padding:10pt 12pt; border-radius:4pt;">
          <p style="color:${C.blue}; font-size:12pt; font-weight:bold; margin:0;">L1 - 平台 (Platform)</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">业务系统级别划分</p>
        </div>
        <div style="background:#CCFBF1; border-left:4pt solid ${C.teal}; padding:10pt 12pt; border-radius:4pt; margin:0 0 0 16pt;">
          <p style="color:${C.teal}; font-size:12pt; font-weight:bold; margin:0;">L2 - 组件 (Component)</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">服务/模块级别划分</p>
        </div>
        <div style="background:#FEF3C7; border-left:4pt solid ${C.amber}; padding:10pt 12pt; border-radius:4pt; margin:0 0 0 32pt;">
          <p style="color:${C.amber}; font-size:12pt; font-weight:bold; margin:0;">L3 - 功能 (Feature)</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">功能模块级别划分</p>
        </div>
        <div style="background:#FFEDD5; border-left:4pt solid ${C.orange}; padding:10pt 12pt; border-radius:4pt; margin:0 0 0 48pt;">
          <p style="color:${C.orange}; font-size:12pt; font-weight:bold; margin:0;">L4 - 子功能 (SubFeature)</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">API级别精细分类</p>
        </div>
      </div>
    </div>
    <div style="width:330pt;">
      <p style="color:${C.textDark}; font-size:14pt; font-weight:bold; margin:0 0 12pt 0;">核心能力</p>
      <div style="display:flex; flex-direction:column; gap:8pt;">
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">树形浏览导航</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">直观的分类树,快速定位目标API</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">完整API信息管理</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">Method/URL/Headers/Body/Response/Schema</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">标签与搜索</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">灵活标签分类 + 多维度搜索筛选</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">批量操作</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">批量编辑、分类调整、导入导出</p>
        </div>
      </div>
    </div>
  </div>
  ${pageIndicator(8, 15)}
</body></html>`);
}

// ==================== SLIDE 9: AI智能生成 ====================
function slide09_ai() {
  return writeSlide('slide09.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    <p style="color:rgba(255,255,255,0.5); font-size:10pt; margin:0 0 4pt 0;">04 主要功能介绍</p>
    <p style="color:#fff; font-size:22pt; font-weight:bold; margin:0;">AI 智能生成 - 对话式用例生成</p>
  </div>
  <div style="display:flex; padding:16pt 36pt; gap:16pt;">
    <div style="width:310pt;">
      <p style="color:${C.textDark}; font-size:13pt; font-weight:bold; margin:0 0 10pt 0;">AI 生成流程</p>
      <div style="display:flex; flex-direction:column; gap:6pt;">
        <div style="display:flex; align-items:center;">
          <div style="background:${C.blue}; width:26pt; height:26pt; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            <p style="color:#fff; font-size:12pt; font-weight:bold; margin:0;">1</p>
          </div>
          <p style="color:${C.textDark}; font-size:11pt; margin:0 0 0 8pt;">用户用自然语言描述测试需求</p>
        </div>
        <div style="margin:0 0 0 12pt; border-left:2pt solid ${C.border}; height:8pt;"></div>
        <div style="display:flex; align-items:center;">
          <div style="background:${C.sky}; width:26pt; height:26pt; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            <p style="color:#fff; font-size:12pt; font-weight:bold; margin:0;">2</p>
          </div>
          <p style="color:${C.textDark}; font-size:11pt; margin:0 0 0 8pt;">AI 通过 Function Calling 搜索API</p>
        </div>
        <div style="margin:0 0 0 12pt; border-left:2pt solid ${C.border}; height:8pt;"></div>
        <div style="display:flex; align-items:center;">
          <div style="background:${C.teal}; width:26pt; height:26pt; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            <p style="color:#fff; font-size:12pt; font-weight:bold; margin:0;">3</p>
          </div>
          <p style="color:${C.textDark}; font-size:11pt; margin:0 0 0 8pt;">获取API详情并分析测试策略</p>
        </div>
        <div style="margin:0 0 0 12pt; border-left:2pt solid ${C.border}; height:8pt;"></div>
        <div style="display:flex; align-items:center;">
          <div style="background:${C.emerald}; width:26pt; height:26pt; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            <p style="color:#fff; font-size:12pt; font-weight:bold; margin:0;">4</p>
          </div>
          <p style="color:${C.textDark}; font-size:11pt; margin:0 0 0 8pt;">自动编排测试步骤并生成用例</p>
        </div>
      </div>
    </div>
    <div style="width:330pt;">
      <p style="color:${C.textDark}; font-size:13pt; font-weight:bold; margin:0 0 10pt 0;">核心技术特性</p>
      <div style="display:flex; flex-direction:column; gap:7pt;">
        <div style="background:#EFF6FF; border-radius:6pt; padding:9pt 12pt;">
          <p style="color:${C.blue}; font-size:11pt; font-weight:bold; margin:0;">多模型支持</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">OpenAI / DeepSeek / Claude / 百度 / 阿里 / 智谱 / Ollama</p>
        </div>
        <div style="background:#F0FDFA; border-radius:6pt; padding:9pt 12pt;">
          <p style="color:${C.teal}; font-size:11pt; font-weight:bold; margin:0;">Function Calling 工具链</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">hierarchical_search / get_detail / assemble_test_cases</p>
        </div>
        <div style="background:#FFFBEB; border-radius:6pt; padding:9pt 12pt;">
          <p style="color:${C.amber}; font-size:11pt; font-weight:bold; margin:0;">SSE 流式输出</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">实时展示思考过程、工具调用、生成结果</p>
        </div>
        <div style="background:#ECFDF5; border-radius:6pt; padding:9pt 12pt;">
          <p style="color:${C.emerald}; font-size:11pt; font-weight:bold; margin:0;">对话式会话管理</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">支持多轮对话、上下文记忆、历史会话管理</p>
        </div>
      </div>
    </div>
  </div>
  ${pageIndicator(9, 15)}
</body></html>`);
}

// ==================== SLIDE 10: 用例编排 ====================
function slide10_orchestration() {
  const nodes = [
    { name: 'Start 节点', desc: '流程起始节点', color: C.emerald },
    { name: 'API 节点', desc: '调用API接口,支持参数化配置', color: C.blue },
    { name: 'Wait 节点', desc: '等待指定时间后继续执行', color: C.amber },
    { name: 'Assertion 节点', desc: '对响应进行断言验证', color: C.teal },
    { name: 'Parallel 节点', desc: '并行分支执行多个步骤', color: C.orange },
    { name: 'End 节点', desc: '流程结束节点', color: C.red },
  ];
  const nodesHtml = nodes.map(n => `
    <div style="display:flex; align-items:center; margin:0 0 7pt 0;">
      <div style="background:${n.color}; width:10pt; height:10pt; border-radius:50%; margin:0 8pt 0 0;"></div>
      <p style="color:${C.textDark}; font-size:10pt; margin:0;"><b>${n.name}</b> - ${n.desc}</p>
    </div>
  `).join('');

  return writeSlide('slide10.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    <p style="color:rgba(255,255,255,0.5); font-size:10pt; margin:0 0 4pt 0;">04 主要功能介绍</p>
    <p style="color:#fff; font-size:22pt; font-weight:bold; margin:0;">用例编排 - 可视化流程设计</p>
  </div>
  <div style="display:flex; padding:16pt 36pt; gap:20pt;">
    <div style="width:320pt;">
      <p style="color:${C.textDark}; font-size:14pt; font-weight:bold; margin:0 0 10pt 0;">基于 React Flow 的可视化画布</p>
      <p style="color:${C.textGray}; font-size:10pt; margin:0 0 14pt 0; line-height:1.5;">通过拖拽式操作将不同类型的节点组合为完整的测试流程,支持节点间连线、参数传递和变量提取,大幅降低用例编排的技术门槛。</p>
      <p style="color:${C.textDark}; font-size:12pt; font-weight:bold; margin:0 0 8pt 0;">节点类型</p>
      ${nodesHtml}
    </div>
    <div style="width:310pt;">
      <p style="color:${C.textDark}; font-size:14pt; font-weight:bold; margin:0 0 10pt 0;">编排能力</p>
      <div style="display:flex; flex-direction:column; gap:8pt;">
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">参数化配置</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">Headers / Query / Path / Body 参数灵活配置</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">变量提取与传递</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">从响应中提取变量,供后续步骤引用</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">断言验证</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">状态码 / 响应体 / Header / JSONPath 断言</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">优先级管理</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">P0-P3 四级优先级,灵活管理用例执行策略</p>
        </div>
      </div>
    </div>
  </div>
  ${pageIndicator(10, 15)}
</body></html>`);
}

// ==================== SLIDE 11: 测试套件与执行 ====================
function slide11_suites() {
  return writeSlide('slide11.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    <p style="color:rgba(255,255,255,0.5); font-size:10pt; margin:0 0 4pt 0;">04 主要功能介绍</p>
    <p style="color:#fff; font-size:22pt; font-weight:bold; margin:0;">测试套件与执行监控</p>
  </div>
  <div style="display:flex; padding:16pt 36pt; gap:16pt;">
    <div style="width:320pt;">
      <p style="color:${C.textDark}; font-size:14pt; font-weight:bold; margin:0 0 10pt 0;">测试套件管理</p>
      <div style="display:flex; flex-direction:column; gap:8pt;">
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">套件组织</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">将多个测试用例组织为可执行套件,支持排序和启用/禁用</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">环境配置</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">BaseURL / 认证Token / Session / 自定义Header</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:10pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">定时调度</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">支持 Cron 表达式定时执行,实现持续回归测试</p>
        </div>
      </div>
    </div>
    <div style="width:320pt;">
      <p style="color:${C.textDark}; font-size:14pt; font-weight:bold; margin:0 0 10pt 0;">执行监控</p>
      <div style="display:flex; flex-direction:column; gap:8pt;">
        <div style="background:#FEF2F2; border-radius:6pt; padding:10pt; border-left:3pt solid ${C.sky};">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">实时日志流</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">SSE 实时推送,逐条展示步骤执行详情</p>
        </div>
        <div style="background:#FEF2F2; border-radius:6pt; padding:10pt; border-left:3pt solid ${C.blue};">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">执行控制</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">启动 / 停止 / 重试,灵活控制执行过程</p>
        </div>
        <div style="background:#FEF2F2; border-radius:6pt; padding:10pt; border-left:3pt solid ${C.emerald};">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">Python 执行引擎</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">FastAPI 独立服务,变量管理器 + 调度器</p>
        </div>
      </div>
    </div>
  </div>
  ${pageIndicator(11, 15)}
</body></html>`);
}

// ==================== SLIDE 12: 测试报告 ====================
function slide12_reports() {
  return writeSlide('slide12.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    <p style="color:rgba(255,255,255,0.5); font-size:10pt; margin:0 0 4pt 0;">04 主要功能介绍</p>
    <p style="color:#fff; font-size:22pt; font-weight:bold; margin:0;">测试报告与数据分析</p>
  </div>
  <div style="display:flex; padding:16pt 36pt; gap:16pt;">
    <div style="width:310pt;">
      <p style="color:${C.textDark}; font-size:14pt; font-weight:bold; margin:0 0 10pt 0;">Dashboard 仪表盘</p>
      <div style="display:flex; flex-wrap:wrap; gap:6pt;">
        <div style="background:${C.blue}; border-radius:8pt; padding:8pt 10pt; width:142pt;">
          <p style="color:rgba(255,255,255,0.8); font-size:9pt; margin:0;">API 总数</p>
          <p style="color:#fff; font-size:18pt; font-weight:bold; margin:2pt 0 0 0;">1,280+</p>
        </div>
        <div style="background:${C.teal}; border-radius:8pt; padding:8pt 10pt; width:142pt;">
          <p style="color:rgba(255,255,255,0.8); font-size:9pt; margin:0;">测试用例</p>
          <p style="color:#fff; font-size:18pt; font-weight:bold; margin:2pt 0 0 0;">3,500+</p>
        </div>
        <div style="background:${C.emerald}; border-radius:8pt; padding:8pt 10pt; width:142pt;">
          <p style="color:rgba(255,255,255,0.8); font-size:9pt; margin:0;">通过率</p>
          <p style="color:#fff; font-size:18pt; font-weight:bold; margin:2pt 0 0 0;">96.5%</p>
        </div>
        <div style="background:${C.amber}; border-radius:8pt; padding:8pt 10pt; width:142pt;">
          <p style="color:rgba(255,255,255,0.8); font-size:9pt; margin:0;">执行次数</p>
          <p style="color:#fff; font-size:18pt; font-weight:bold; margin:2pt 0 0 0;">12,000+</p>
        </div>
      </div>
    </div>
    <div style="width:330pt;">
      <p style="color:${C.textDark}; font-size:14pt; font-weight:bold; margin:0 0 10pt 0;">报告能力</p>
      <div style="display:flex; flex-direction:column; gap:7pt;">
        <div style="background:${C.lightBg}; border-radius:6pt; padding:9pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">执行历史追溯</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">完整记录每次执行的详细信息和日志</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:9pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">详细步骤日志</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">请求/响应/断言结果逐步展示</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:9pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">可视化图表</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">基于 Recharts 的趋势分析和统计图表</p>
        </div>
        <div style="background:${C.lightBg}; border-radius:6pt; padding:9pt 12pt;">
          <p style="color:${C.textDark}; font-size:11pt; font-weight:bold; margin:0;">多维度筛选</p>
          <p style="color:${C.textGray}; font-size:9pt; margin:2pt 0 0 0;">按套件/时间/状态/用例灵活筛选</p>
        </div>
      </div>
    </div>
  </div>
  ${pageIndicator(12, 15)}
</body></html>`);
}

// ==================== SLIDE 13: 应用实践 ====================
function slide13_practice() {
  return writeSlide('slide13.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.white}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    ${sectionHeader('05', '<span style="color:#fff;">应用实践</span>')}
  </div>
  <div style="padding:14pt 36pt;">
    <p style="color:${C.textDark}; font-size:13pt; font-weight:bold; margin:0 0 10pt 0;">端到端测试流程</p>
    <div style="display:flex; align-items:center; gap:6pt; margin:0 0 16pt 0; justify-content:center;">
      <div style="background:${C.blue}; border-radius:6pt; padding:8pt 12pt;">
        <p style="color:#fff; font-size:10pt; font-weight:bold; margin:0; text-align:center;">API采集</p>
      </div>
      <p style="color:${C.textGray}; font-size:16pt; margin:0;">&#8594;</p>
      <div style="background:${C.teal}; border-radius:6pt; padding:8pt 12pt;">
        <p style="color:#fff; font-size:10pt; font-weight:bold; margin:0; text-align:center;">入库管理</p>
      </div>
      <p style="color:${C.textGray}; font-size:16pt; margin:0;">&#8594;</p>
      <div style="background:${C.amber}; border-radius:6pt; padding:8pt 12pt;">
        <p style="color:#fff; font-size:10pt; font-weight:bold; margin:0; text-align:center;">AI生成</p>
      </div>
      <p style="color:${C.textGray}; font-size:16pt; margin:0;">&#8594;</p>
      <div style="background:${C.sky}; border-radius:6pt; padding:8pt 12pt;">
        <p style="color:#fff; font-size:10pt; font-weight:bold; margin:0; text-align:center;">用例编排</p>
      </div>
      <p style="color:${C.textGray}; font-size:16pt; margin:0;">&#8594;</p>
      <div style="background:${C.orange}; border-radius:6pt; padding:8pt 12pt;">
        <p style="color:#fff; font-size:10pt; font-weight:bold; margin:0; text-align:center;">套件执行</p>
      </div>
      <p style="color:${C.textGray}; font-size:16pt; margin:0;">&#8594;</p>
      <div style="background:${C.emerald}; border-radius:6pt; padding:8pt 12pt;">
        <p style="color:#fff; font-size:10pt; font-weight:bold; margin:0; text-align:center;">测试报告</p>
      </div>
    </div>

    <div style="display:flex; gap:14pt;">
      <div style="background:#EFF6FF; border-radius:8pt; padding:12pt; width:210pt; border-top:3pt solid ${C.blue};">
        <p style="color:${C.blue}; font-size:12pt; font-weight:bold; margin:0 0 6pt 0;">场景一：接口回归测试</p>
        <p style="color:${C.textGray}; font-size:9pt; margin:0; line-height:1.4;">每日定时执行核心业务接口回归套件,第一时间发现接口异常,保障线上服务稳定性。</p>
      </div>
      <div style="background:#F0FDFA; border-radius:8pt; padding:12pt; width:210pt; border-top:3pt solid ${C.teal};">
        <p style="color:${C.teal}; font-size:12pt; font-weight:bold; margin:0 0 6pt 0;">场景二：新功能联调验证</p>
        <p style="color:${C.textGray}; font-size:9pt; margin:0; line-height:1.4;">通过HAR录制快速采集新接口,AI生成测试用例,验证新功能API的正确性和完整性。</p>
      </div>
      <div style="background:#FFFBEB; border-radius:8pt; padding:12pt; width:210pt; border-top:3pt solid ${C.amber};">
        <p style="color:${C.amber}; font-size:12pt; font-weight:bold; margin:0 0 6pt 0;">场景三：跨系统集成测试</p>
        <p style="color:${C.textGray}; font-size:9pt; margin:0; line-height:1.4;">利用四层分类管理多系统API资产,编排跨系统业务流程用例,验证系统间接口交互。</p>
      </div>
    </div>
  </div>
  ${pageIndicator(13, 15)}
</body></html>`);
}

// ==================== SLIDE 14: 成效 ====================
function slide14_results() {
  const metrics = [
    { label: '用例编写效率', value: '70%+', desc: 'AI辅助自动生成', color: C.blue },
    { label: '回归执行时间', value: '60%+', desc: '自动化替代手工', color: C.teal },
    { label: '接口覆盖率', value: '95%+', desc: '系统化管理提升', color: C.emerald },
    { label: '缺陷发现率', value: '40%+', desc: '智能用例补充', color: C.amber },
  ];
  const metricsHtml = metrics.map(m => `
    <div style="background:${C.white}; border:1px solid ${C.border}; border-radius:10pt; padding:16pt; width:145pt; display:flex; flex-direction:column; align-items:center; border-top:3pt solid ${m.color};">
      <p style="color:${m.color}; font-size:28pt; font-weight:bold; margin:0; text-align:center;">${m.value}</p>
      <p style="color:${C.textDark}; font-size:12pt; font-weight:bold; margin:4pt 0 2pt 0; text-align:center;">${m.label}</p>
      <p style="color:${C.textGray}; font-size:9pt; margin:0; text-align:center;">${m.desc}</p>
    </div>
  `).join('');

  return writeSlide('slide14.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body { background: ${C.lightBg}; }
</style></head><body>
  <div style="background:${C.navy}; padding:16pt 36pt;">
    ${sectionHeader('06', '<span style="color:#fff;">成效</span>')}
  </div>
  <div style="padding:20pt 36pt;">
    <p style="color:${C.textDark}; font-size:14pt; font-weight:bold; margin:0 0 14pt 0; text-align:center;">关键指标提升</p>
    <div style="display:flex; gap:14pt; justify-content:center; margin:0 0 18pt 0;">
      ${metricsHtml}
    </div>
    <div style="display:flex; gap:14pt;">
      <div style="background:${C.white}; border-radius:8pt; padding:12pt; width:320pt; border:1px solid ${C.border};">
        <p style="color:${C.textDark}; font-size:12pt; font-weight:bold; margin:0 0 6pt 0;">质量提升</p>
        <ul style="margin:0; padding:0 0 0 14pt;">
          <li><p style="color:${C.textGray}; font-size:9pt; margin:0 0 3pt 0;">API资产统一管理,避免信息孤岛</p></li>
          <li><p style="color:${C.textGray}; font-size:9pt; margin:0 0 3pt 0;">AI智能补充边界用例,减少人工遗漏</p></li>
          <li><p style="color:${C.textGray}; font-size:9pt; margin:0;">可视化编排降低技术门槛,全员可参与</p></li>
        </ul>
      </div>
      <div style="background:${C.white}; border-radius:8pt; padding:12pt; width:320pt; border:1px solid ${C.border};">
        <p style="color:${C.textDark}; font-size:12pt; font-weight:bold; margin:0 0 6pt 0;">效率提升</p>
        <ul style="margin:0; padding:0 0 0 14pt;">
          <li><p style="color:${C.textGray}; font-size:9pt; margin:0 0 3pt 0;">定时回归执行,无人值守持续验证</p></li>
          <li><p style="color:${C.textGray}; font-size:9pt; margin:0 0 3pt 0;">从采集到报告的完整闭环,流程提效</p></li>
          <li><p style="color:${C.textGray}; font-size:9pt; margin:0;">团队协作共享测试资产,消除重复劳动</p></li>
        </ul>
      </div>
    </div>
  </div>
  ${pageIndicator(14, 15)}
</body></html>`);
}

// ==================== SLIDE 15: THANK YOU ====================
function slide15_thanks(bgImg) {
  return writeSlide('slide15.html', `<!DOCTYPE html><html><head><style>
${baseStyle}
body {
  background: ${C.darkBlue};
  justify-content: center;
  align-items: center;
}
</style></head><body>
  <div style="display:flex; flex-direction:column; align-items:center;">
    <p style="color:#fff; font-size:40pt; font-weight:bold; margin:0 0 10pt 0; text-align:center;">Thank You</p>
    <p style="color:rgba(255,255,255,0.8); font-size:16pt; margin:0 0 20pt 0; text-align:center;">感谢聆听</p>
    <div style="background:rgba(255,255,255,0.2); width:80pt; height:2pt; border-radius:2pt; margin:0 0 20pt 0;"></div>
    <p style="color:rgba(255,255,255,0.6); font-size:12pt; margin:0; text-align:center;">Q&A</p>
  </div>
</body></html>`);
}

// ==================== MAIN ====================
async function main() {
  console.log('Creating gradient backgrounds...');
  const coverBg = await createGradient('cover-bg.png', '#0F172A', '#1E3A5F', 960, 540);
  const thanksBg = await createGradient('thanks-bg.png', '#1E3A5F', '#0F172A', 960, 540);

  console.log('Creating HTML slides...');
  const slideFiles = [
    slide01_cover(coverBg),
    slide02_toc(),
    slide03_pain(),
    slide04_value(),
    slide05_arch(),
    slide06_features(),
    slide07_capture(),
    slide08_repo(),
    slide09_ai(),
    slide10_orchestration(),
    slide11_suites(),
    slide12_reports(),
    slide13_practice(),
    slide14_results(),
    slide15_thanks(thanksBg),
  ];

  console.log('Converting to PowerPoint...');
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'API Testing Team';
  pptx.title = 'API智能测试平台应用实践分享';

  for (let i = 0; i < slideFiles.length; i++) {
    console.log(`  Processing slide ${i + 1}/${slideFiles.length}: ${path.basename(slideFiles[i])}`);
    try {
      await html2pptx(slideFiles[i], pptx);
    } catch (e) {
      console.error(`  Error on slide ${i + 1}:`, e.message);
    }
  }

  const outputPath = path.join(__dirname, 'API-Testing-Platform-Sharing.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log(`\nPresentation saved to: ${outputPath}`);
}

main().catch(console.error);
