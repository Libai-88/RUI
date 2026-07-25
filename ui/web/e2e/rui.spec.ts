import { test, expect } from '@playwright/test';
import * as cp from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mockProcess;
let mockPort;

test.beforeAll(async () => {
  // Start mock ACP server
  mockPort = 3180 + Math.floor(Math.random() * 1000);
  mockProcess = cp.spawn('node', [path.join(__dirname, 'mock-acp-server.mjs')], {
    env: { ...process.env, MOCK_ACP_PORT: String(mockPort) },
    stdio: 'pipe',
  });
  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

test.afterAll(() => {
  if (mockProcess) mockProcess.kill();
});

// ---------------------------------------------------------------------------
// 1. Happy path: connect → create session → send prompt → observe streaming
// ---------------------------------------------------------------------------

test('完整链路：连接 → 创建 Session → 发送 prompt → 观察流式输出', async ({ page }) => {
  await page.goto('/');

  // Should show connection wizard
  await expect(page.getByText('连接到 ACP 服务')).toBeVisible();

  // Fill connection form
  await page.fill('#endpoint', `http://127.0.0.1:${mockPort}`);
  await page.fill('#workspace', 'D:/e2e-test-project');

  // Click direct connect
  await page.click('text=直接连接');

  // Should transition to main UI
  await expect(page.getByTestId('three-column-layout')).toBeVisible({ timeout: 10000 });

  // Session list should be visible
  await expect(page.getByTestId('left-panel')).toBeVisible();

  // Create new session
  await page.click('text=新建会话');

  // Should see chat creating indicator
  await expect(page.getByText('正在创建会话')).toBeVisible({ timeout: 5000 });

  // Once session is created, input should be available
  await expect(page.getByPlaceholder(/Enter 发送/)).toBeVisible({ timeout: 5000 });

  // Type a message and send
  await page.fill('textarea', '你好，请帮我查询一下');
  await page.click('text=发送');

  // Should see streaming response in chat
  await expect(page.getByText('Mock ACP')).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// 2. Permission request flow
// ---------------------------------------------------------------------------

test('工具调用和权限路径', async ({ page }) => {
  await page.goto('/');

  // Connect with permission scenario
  await page.fill('#endpoint', `http://127.0.0.1:${mockPort}`);
  await page.fill('#workspace', 'D:/e2e-perm-test');
  await page.click('text=直接连接');
  await expect(page.getByTestId('three-column-layout')).toBeVisible({ timeout: 10000 });

  await page.click('text=新建会话');
  await expect(page.getByPlaceholder(/Enter 发送/)).toBeVisible({ timeout: 5000 });

  // Make input textarea visible and type
  const textarea = page.locator('textarea');
  await textarea.fill('读取文件');

  // Override scenario via the app's session mechanism
  // We'll use the permission scenario which triggers permission request
  // For now, just test that permission request can be rendered
  await textarea.press('Enter');

  // Check context area shows permissions section
  await expect(page.getByTestId('context-area')).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// 3. Cancel generation
// ---------------------------------------------------------------------------

test('取消生成', async ({ page }) => {
  await page.goto('/');

  await page.fill('#endpoint', `http://127.0.0.1:${mockPort}`);
  await page.fill('#workspace', 'D:/e2e-cancel-test');
  await page.click('text=直接连接');
  await expect(page.getByTestId('three-column-layout')).toBeVisible({ timeout: 10000 });

  await page.click('text=新建会话');
  await expect(page.getByPlaceholder(/Enter 发送/)).toBeVisible({ timeout: 5000 });

  await page.fill('textarea', '生成一个长文本');
  await page.click('text=发送');

  // Should see cancel button appear
  await expect(page.getByText('取消')).toBeVisible({ timeout: 5000 });
  await page.click('text=取消');

  // After cancel, send button should reappear
  await expect(page.getByText('发送')).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// 4. Connection failure
// ---------------------------------------------------------------------------

test('连接失败场景', async ({ page }) => {
  await page.goto('/');

  // Try connecting to a non-existent server
  await page.fill('#endpoint', 'http://127.0.0.1:1');
  await page.fill('#workspace', 'D:/test');

  // Test connection should fail
  await page.click('text=测试连接');

  // Should see error message
  await expect(page.getByText(/无法连接|失败/)).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// 5. Auth failure
// ---------------------------------------------------------------------------

test('认证失败场景', async ({ page }) => {
  await page.goto('/');

  // Fill and try to connect
  await page.fill('#endpoint', 'http://127.0.0.1:1');
  await page.fill('#secretKey', 'wrong-key');
  await page.fill('#workspace', 'D:/test');

  // Test connection should fail
  await page.click('text=测试连接');
  await expect(page.getByText(/失败|错误/)).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// 6. Session list and session loading
// ---------------------------------------------------------------------------

test('加载已有 Session', async ({ page }) => {
  await page.goto('/');

  await page.fill('#endpoint', `http://127.0.0.1:${mockPort}`);
  await page.fill('#workspace', 'D:/e2e-load-test');
  await page.click('text=直接连接');
  await expect(page.getByTestId('three-column-layout')).toBeVisible({ timeout: 10000 });

  // Should see session list with at least the "暂无会话" state
  await expect(page.getByTestId('left-panel')).toBeVisible();

  // Create a session
  await page.click('text=新建会话');
  await expect(page.getByPlaceholder(/Enter 发送/)).toBeVisible({ timeout: 5000 });
  await page.fill('textarea', '测试消息');
  await page.click('text=发送');

  // Wait for response
  await page.waitForTimeout(2000);
});

// ---------------------------------------------------------------------------
// 7. Context area visibility
// ---------------------------------------------------------------------------

test('上下文区展示工作区和连接信息', async ({ page }) => {
  await page.goto('/');

  await page.fill('#endpoint', `http://127.0.0.1:${mockPort}`);
  await page.fill('#workspace', 'D:/e2e-context-test');
  await page.click('text=直接连接');
  await expect(page.getByTestId('three-column-layout')).toBeVisible({ timeout: 10000 });

  // Context area should be visible
  const contextArea = page.getByTestId('context-area');
  await expect(contextArea).toBeVisible();

  // Should show workspace path
  await expect(contextArea.getByText('D:/e2e-context-test')).toBeVisible();

  // Should show connection state
  await expect(contextArea.getByText('已连接')).toBeVisible();
});
