"""
测试执行器 - 核心执行引擎
"""
import asyncio
import httpx
from typing import Any, Dict, List, Optional
from datetime import datetime
from models import (
    TestCase, FlowNode, NodeType, ApiNodeData, ParallelNodeData,
    ExecutionResult, StepExecutionResult, WaitConfig, WaitType
)
from variable_manager import VariableManager
from assertion_engine import AssertionEngine, AssertionResult
from wait_handler import WaitHandler
from logger_config import get_logger

# 获取日志器
logger = get_logger('executor')


class TestExecutor:
    """测试执行器 - 负责执行测试用例"""
    
    def __init__(self, timeout: int = 30, database=None, environment_config: Optional[Dict[str, Any]] = None, case_execution_id: Optional[str] = None, suite_execution_id: Optional[str] = None):
        """
        初始化测试执行器
        
        Args:
            timeout: HTTP 请求超时时间（秒）
            database: 数据库实例（用于获取 API 完整信息）
            environment_config: 自定义环境配置（如果提供，优先使用此配置而不是平台设置）
            case_execution_id: 用例执行ID（用于保存步骤执行记录和日志）
            suite_execution_id: 套件执行ID（用于日志关联）
        """
        self.timeout = timeout
        self.client: Optional[httpx.AsyncClient] = None
        self.database = database
        self.case_execution_id = case_execution_id  # 用例执行ID
        self.suite_execution_id = suite_execution_id  # 套件执行ID
        self.platform_settings = None
        self.config_source = "未配置"  # 配置来源标识
        
        # 如果提供了自定义配置，使用它；否则从数据库加载平台设置
        if environment_config:
            self.platform_settings = environment_config
            self.config_source = "指定配置"
            print(f"[{self.config_source}] 使用自定义配置")
            print(f"[{self.config_source}] BaseURL: {self.platform_settings.get('baseUrl')}")
            print(f"[{self.config_source}] Auth Token 启用: {self.platform_settings.get('authTokenEnabled')}")
            print(f"[{self.config_source}] Session 启用: {self.platform_settings.get('sessionEnabled')}")
        elif self.database:
            self.platform_settings = self.database.get_platform_settings()
            if self.platform_settings:
                self.config_source = "全局配置"
                print(f"[{self.config_source}] 已加载平台设置")
                print(f"[{self.config_source}] BaseURL: {self.platform_settings.get('baseUrl')}")
                print(f"[{self.config_source}] Auth Token 启用: {self.platform_settings.get('authTokenEnabled')}")
                print(f"[{self.config_source}] Session 启用: {self.platform_settings.get('sessionEnabled')}")
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        # 不传入cookies参数，这样httpx不会维护cookie jar
        # 所有的cookies都通过headers['Cookie']手动控制，完全依赖平台设置
        self.client = httpx.AsyncClient(
            timeout=self.timeout,
            verify=False,  # 禁用 SSL 验证（生产环境应启用）
            follow_redirects=True,  # 支持重定向
            # 不传入cookies参数，禁用自动cookie管理
        )
        
        print("[HTTP客户端] 已初始化，禁用自动Cookie管理，完全依赖平台设置")
        if self.platform_settings:
            if self.platform_settings.get('authTokenEnabled'):
                print(f"[认证模式] Token认证已启用")
            if self.platform_settings.get('sessionEnabled'):
                print(f"[认证模式] Session认证已启用")
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器退出"""
        if self.client:
            await self.client.aclose()
    
    async def execute_test_case(self, test_case: TestCase) -> ExecutionResult:
        """
        执行测试用例
        
        Args:
            test_case: 测试用例对象
            
        Returns:
            执行结果
        """
        start_time = datetime.now()
        
        # 记录测试用例执行开始
        logger.info(f"\n{'='*60}")
        logger.info(f"🚀 开始执行测试用例: {test_case.name}")
        logger.info(f"   用例 ID: {test_case.id}")
        if self.case_execution_id:
            logger.info(f"   执行记录 ID: {self.case_execution_id}")
        logger.info(f"{'='*60}")
        
        # 初始化变量管理器
        variable_manager = VariableManager(
            test_case.flowConfig.variables or {}
        )
        
        logger.data_flow(f"初始化变量管理器", data={
            'variableCount': len(test_case.flowConfig.variables or {})
        })
        
        # 初始化断言引擎和等待处理器
        assertion_engine = AssertionEngine(variable_manager)
        wait_handler = WaitHandler(variable_manager)
        
        # 解析执行流程（将节点分为普通节点和后置清理节点）
        execution_order, cleanup_nodes = self._build_execution_order(test_case.flowConfig)
        
        # 初始化结果（总步数包括普通节点和后置清理节点）
        total_steps = len(execution_order) + len(cleanup_nodes)
        result = ExecutionResult(
            success=True,
            testCaseId=test_case.id or "",
            testCaseName=test_case.name,
            startTime=start_time,
            totalSteps=total_steps,
            executedSteps=0,
            passedSteps=0,
            failedSteps=0,
            steps=[],
            variables={}
        )
        
        # 标记是否有普通节点失败
        has_failure = False
        
        try:
            # 第一阶段：按顺序执行普通节点
            for idx, node in enumerate(execution_order):
                # 创建步骤执行记录（如果有case_execution_id）
                step_execution_id = None
                if self.case_execution_id and self.database:
                    try:
                        step_execution_id = self.database.create_step_execution(
                            case_execution_id=self.case_execution_id,
                            node_id=node.id,
                            node_name=node.data.get('name', f'步骤 {idx + 1}'),
                            node_type=node.type.value,
                            node_snapshot=node.dict(),
                            order=idx + 1
                        )
                        
                        # 记录步骤开始日志
                        self.database.create_execution_log(
                            level='info',
                            message=f'开始执行节点: {node.data.get("name", node.id)}',
                            step_execution_id=step_execution_id,
                            case_execution_id=self.case_execution_id,
                            suite_execution_id=self.suite_execution_id,
                            node_id=node.id,
                            node_name=node.data.get('name'),
                            log_type='system'
                        )
                    except Exception as e:
                        print(f"⚠️ 创建步骤执行记录失败: {e}")
                
                step_result = await self._execute_node(
                    node=node,
                    variable_manager=variable_manager,
                    assertion_engine=assertion_engine,
                    wait_handler=wait_handler,
                    step_execution_id=step_execution_id
                )
                
                result.steps.append(step_result.dict())
                result.executedSteps += 1
                
                if step_result.success:
                    result.passedSteps += 1
                else:
                    result.failedSteps += 1
                    result.success = False
                    result.error = f"步骤 '{step_result.stepName}' 执行失败: {step_result.error}"
                    has_failure = True
                    break  # 遇到失败就停止普通节点的执行
            
            # 第二阶段：执行后置清理节点（无论前面成功或失败都执行）
            if cleanup_nodes:
                if has_failure:
                    print(f"⚠️ 检测到普通节点失败，但仍将执行 {len(cleanup_nodes)} 个后置清理节点")
                    if self.case_execution_id and self.database:
                        try:
                            self.database.create_execution_log(
                                level='info',
                                message=f'开始执行后置清理节点（共{len(cleanup_nodes)}个）',
                                case_execution_id=self.case_execution_id,
                                suite_execution_id=self.suite_execution_id,
                                log_type='system'
                            )
                        except Exception as e:
                            print(f"⚠️ 记录后置清理日志失败: {e}")
                
                for idx, node in enumerate(cleanup_nodes):
                    cleanup_idx = len(execution_order) + idx
                    step_execution_id = None
                    
                    if self.case_execution_id and self.database:
                        try:
                            step_execution_id = self.database.create_step_execution(
                                case_execution_id=self.case_execution_id,
                                node_id=node.id,
                                node_name=f'[清理] {node.data.get("name", f"步骤 {cleanup_idx + 1}")}',
                                node_type=node.type.value,
                                node_snapshot=node.dict(),
                                order=cleanup_idx + 1
                            )
                            
                            # 记录后置清理节点开始日志
                            self.database.create_execution_log(
                                level='info',
                                message=f'开始执行后置清理节点: {node.data.get("name", node.id)}',
                                step_execution_id=step_execution_id,
                                case_execution_id=self.case_execution_id,
                                suite_execution_id=self.suite_execution_id,
                                node_id=node.id,
                                node_name=node.data.get('name'),
                                log_type='system'
                            )
                        except Exception as e:
                            print(f"⚠️ 创建后置清理步骤记录失败: {e}")
                    
                    step_result = await self._execute_node(
                        node=node,
                        variable_manager=variable_manager,
                        assertion_engine=assertion_engine,
                        wait_handler=wait_handler,
                        step_execution_id=step_execution_id
                    )
                    
                    result.steps.append(step_result.dict())
                    result.executedSteps += 1
                    
                    if step_result.success:
                        result.passedSteps += 1
                    else:
                        result.failedSteps += 1
                        # 后置清理节点失败不影响整体成功状态（如果前面已经成功）
                        # 但会记录警告
                        if not has_failure:
                            # 如果前面都成功，但清理失败，标记为失败并记录
                            result.success = False
                            result.error = f"后置清理步骤 '{step_result.stepName}' 执行失败: {step_result.error}"
                        
                        if self.case_execution_id and self.database:
                            try:
                                self.database.create_execution_log(
                                    level='warning',
                                    message=f'后置清理节点执行失败，但不影响其他清理节点: {step_result.error}',
                                    step_execution_id=step_execution_id,
                                    case_execution_id=self.case_execution_id,
                                    suite_execution_id=self.suite_execution_id,
                                    node_id=node.id,
                                    node_name=node.data.get('name'),
                                    log_type='system'
                                )
                            except Exception as e:
                                print(f"⚠️ 记录后置清理失败日志失败: {e}")
                        # 继续执行其他后置清理节点，不中断
        
        except Exception as e:
            result.success = False
            result.error = f"执行异常: {str(e)}"
        
        finally:
            # 记录结束时间和耗时
            result.endTime = datetime.now()
            result.duration = (result.endTime - start_time).total_seconds()
            result.variables = variable_manager.get_all_variables()
        
        return result
    
    def _build_execution_order(self, flow_config):
        """
        构建执行顺序
        
        根据节点和边的关系，构建一个有序的执行列表
        将节点分为普通节点和后置清理节点
        
        Args:
            flow_config: 流程图配置
            
        Returns:
            元组: (普通节点列表, 后置清理节点列表)
        """
        nodes_dict = {node.id: node for node in flow_config.nodes}
        edges = flow_config.edges
        
        # 构建邻接表
        graph = {node.id: [] for node in flow_config.nodes}
        for edge in edges:
            graph[edge.source].append(edge.target)
        
        # 找到起始节点
        start_nodes = [
            node for node in flow_config.nodes 
            if node.type == NodeType.START
        ]
        
        if not start_nodes:
            return [], []
        
        # 从起始节点开始，BFS 遍历
        all_nodes = []
        visited = set()
        queue = [start_nodes[0].id]
        
        while queue:
            node_id = queue.pop(0)
            
            if node_id in visited:
                continue
            
            visited.add(node_id)
            node = nodes_dict.get(node_id)
            
            if node and node.type != NodeType.START and node.type != NodeType.END:
                all_nodes.append(node)
            
            # 添加下游节点
            for next_node_id in graph.get(node_id, []):
                if next_node_id not in visited:
                    queue.append(next_node_id)
        
        # 分离普通节点和后置清理节点
        normal_nodes = []
        cleanup_nodes = []
        
        for node in all_nodes:
            # 检查节点是否标记为后置清理
            is_cleanup = False
            
            try:
                if node.type == NodeType.API:
                    # API 节点 - node.data 是字典
                    is_cleanup = node.data.get('isCleanup', False) if isinstance(node.data, dict) else getattr(node.data, 'isCleanup', False)
                elif node.type == NodeType.PARALLEL:
                    # 并行节点 - node.data 是字典
                    is_cleanup = node.data.get('isCleanup', False) if isinstance(node.data, dict) else getattr(node.data, 'isCleanup', False)
                
                if is_cleanup:
                    cleanup_nodes.append(node)
                    node_name = node.data.get('name', node.id) if isinstance(node.data, dict) else getattr(node.data, 'name', node.id)
                    print(f"🧹 检测到后置清理节点: {node_name} (类型: {node.type.value})")
                else:
                    normal_nodes.append(node)
            except Exception as e:
                print(f"⚠️ 解析节点 {node.id} 的清理标识时出错: {e}")
                # 出错时视为普通节点
                normal_nodes.append(node)
        
        if cleanup_nodes:
            print(f"📋 执行计划: {len(normal_nodes)} 个普通节点 + {len(cleanup_nodes)} 个后置清理节点")
        
        return normal_nodes, cleanup_nodes
    
    async def _execute_node(
        self,
        node: FlowNode,
        variable_manager: VariableManager,
        assertion_engine: AssertionEngine,
        wait_handler: WaitHandler,
        step_execution_id: Optional[str] = None
    ) -> StepExecutionResult:
        """
        执行单个节点
        
        Args:
            node: 流程图节点
            variable_manager: 变量管理器
            assertion_engine: 断言引擎
            wait_handler: 等待处理器
            step_execution_id: 步骤执行ID（用于保存执行结果）
            
        Returns:
            步骤执行结果
        """
        start_time = datetime.now()
        
        result = StepExecutionResult(
            stepId=node.id,
            stepName=node.data.get('name', f'Step {node.id}'),
            nodeId=node.id,
            nodeType=node.type,
            success=True,
            startTime=start_time
        )
        
        try:
            if node.type == NodeType.API:
                await self._execute_api_node(
                    node, variable_manager, assertion_engine, result, step_execution_id
                )
            
            elif node.type == NodeType.WAIT:
                await self._execute_wait_node(
                    node, wait_handler, result, step_execution_id
                )
            
            elif node.type == NodeType.ASSERTION:
                await self._execute_assertion_node(
                    node, variable_manager, assertion_engine, result, step_execution_id
                )
            
            elif node.type == NodeType.PARALLEL:
                await self._execute_parallel_node(
                    node, variable_manager, assertion_engine, result, step_execution_id
                )
        
        except Exception as e:
            result.success = False
            result.error = str(e)
            
            # 记录错误日志
            if step_execution_id and self.database:
                try:
                    self.database.create_execution_log(
                        level='error',
                        message=f'节点执行异常: {str(e)}',
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='error',
                        details={'error': str(e)}
                    )
                except:
                    pass
        
        finally:
            result.endTime = datetime.now()
            result.duration = (result.endTime - start_time).total_seconds()
            
            # 更新步骤执行记录
            if step_execution_id and self.database:
                try:
                    update_data = {
                        'status': 'success' if result.success else 'failed',
                        'endTime': result.endTime,
                        'duration': int(result.duration * 1000)
                    }
                    
                    if result.error:
                        update_data['errorMessage'] = result.error
                    
                    if result.extractedVariables:
                        update_data['extractedVariables'] = result.extractedVariables
                    
                    self.database.update_step_execution(
                        step_execution_id,
                        **update_data
                    )
                    
                    # 记录完成日志
                    log_level = 'success' if result.success else 'error'
                    log_message = f'节点执行{"成功" if result.success else "失败"}，耗时 {int(result.duration * 1000)}ms'
                    if result.error:
                        log_message += f': {result.error}'
                    
                    self.database.create_execution_log(
                        level=log_level,
                        message=log_message,
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='system'
                    )
                except Exception as e:
                    print(f"⚠️ 更新步骤执行记录失败: {e}")
        
        return result
    
    async def _execute_api_node(
        self,
        node: FlowNode,
        variable_manager: VariableManager,
        assertion_engine: AssertionEngine,
        result: StepExecutionResult,
        step_execution_id: Optional[str] = None
    ) -> None:
        """执行 API 节点"""
        try:
            # 记录节点开始执行日志
            if step_execution_id and self.database:
                try:
                    self.database.create_execution_log(
                        level='info',
                        message=f'开始执行API节点',
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='system'
                    )
                except:
                    pass
            # 解析节点数据
            api_data = ApiNodeData(**node.data)
            
            # 获取URL - 优先使用节点配置的URL（可能包含占位符）
            url = api_data.url
            print(f"[API执行] 节点配置的URL: {url}")
            
            # 如果节点URL不包含占位符且数据库中有完整URL，使用数据库的
            # 但如果包含占位符（如 {id}），则保留节点配置的URL
            if self.database and api_data.apiId and '{' not in url:
                api_info = self.database.get_api_by_id(api_data.apiId)
                if api_info and api_info.get('url'):
                    print(f"[API执行] 数据库URL: {api_info['url']}")
                    url = api_info['url']
            
            # 解析请求配置
            resolved_config = {}
            if api_data.requestConfig:
                print(f"[API执行] 原始请求配置: {api_data.requestConfig.dict()}")
                resolved_config = variable_manager.resolve_request_config(
                    api_data.requestConfig.dict()
                )
                print(f"[API执行] 解析后的请求配置: {resolved_config}")
            
            # 构建 URL - 替换路径参数
            if resolved_config.get('pathParams'):
                print(f"[API执行] 替换前的URL: {url}")
                print(f"[API执行] 路径参数: {resolved_config['pathParams']}")
                url = variable_manager.replace_url_params(
                    url, resolved_config['pathParams']
                )
                print(f"[API执行] 替换后的URL: {url}")
            
            # 移除 URL 中的查询参数（查询参数将从 queryParams 配置中重新构建）
            from urllib.parse import urlparse, urlunparse
            parsed_url = urlparse(url)
            # 重新构建 URL，不包含查询参数和 fragment
            url_without_query = urlunparse((
                parsed_url.scheme,
                parsed_url.netloc,
                parsed_url.path,
                '',  # params (不常用)
                '',  # query - 移除查询参数
                ''   # fragment - 移除 fragment
            ))
            if url_without_query != url:
                print(f"[API执行] 移除URL中的查询参数: {url} -> {url_without_query}")
                url = url_without_query
            
            # 应用平台设置 - 拼接或替换 BaseURL
            if self.platform_settings and self.platform_settings.get('baseUrl'):
                base_url = self.platform_settings['baseUrl'].rstrip('/')
                
                if url.startswith('http://') or url.startswith('https://'):
                    # URL是完整的，需要替换域名部分
                    # 提取路径部分（从第三个斜杠开始）
                    parsed = urlparse(url)
                    path = parsed.path  # 只保留路径部分，不包含查询参数
                    
                    url = f"{base_url}{path}"
                    print(f"[{self.config_source}] 替换BaseURL后的URL: {url}")
                else:
                    # URL是相对路径，直接拼接
                    url = f"{base_url}/{url.lstrip('/')}"
                    print(f"[{self.config_source}] 拼接BaseURL后的URL: {url}")
            
            # 构建请求头
            headers = resolved_config.get('headers', {}).copy()
            
            # 应用平台设置 - 添加认证Token
            if self.platform_settings and self.platform_settings.get('authTokenEnabled'):
                auth_key = self.platform_settings.get('authTokenKey')
                auth_value = self.platform_settings.get('authTokenValue')
                if auth_key and auth_value:
                    headers[auth_key] = auth_value
                    print(f"[{self.config_source}] 添加认证Token: {auth_key}")
            
            # 应用平台设置 - 添加Session Cookies
            if self.platform_settings and self.platform_settings.get('sessionEnabled'):
                session_cookies = self.platform_settings.get('sessionCookies')
                print(f"[{self.config_source}] Session模式已启用")
                print(f"[{self.config_source}] sessionCookies内容: {session_cookies}")
                if session_cookies:
                    # 添加到Cookie头（类似requests.Session()自动管理cookies）
                    existing_cookie = headers.get('Cookie', '')
                    if existing_cookie:
                        # 合并已有的cookie和session cookies
                        headers['Cookie'] = f'{existing_cookie}; {session_cookies}'
                        print(f"[{self.config_source}] 合并Cookies: 原有={existing_cookie[:50]}... + Session={session_cookies[:50]}...")
                    else:
                        headers['Cookie'] = session_cookies
                    print(f"[{self.config_source}] 添加Session Cookies: {session_cookies[:100]}...")
                else:
                    print(f"[{self.config_source}] ⚠️  Session模式已启用，但sessionCookies为空，可能需要测试登录")
            else:
                print(f"[{self.config_source}] Session模式未启用或无配置")
            
            # 构建完整的 URL（包含查询参数）用于显示
            query_params = resolved_config.get('queryParams', {})
            display_url = url
            if query_params:
                from urllib.parse import urlencode
                query_string = urlencode(query_params)
                display_url = f"{url}?{query_string}"
                print(f"[API执行] 完整URL（含查询参数）: {display_url}")
            
            # 构建请求 - 用于实际发送（httpx 会从 params 自动拼接查询参数）
            request_data = {
                'method': api_data.method.upper(),
                'url': url,  # 不带查询参数的干净 URL
                'headers': headers,
            }
            
            # 添加查询参数（httpx 会自动拼接）
            if query_params:
                request_data['params'] = query_params
            
            # 添加请求体
            if resolved_config.get('body'):
                request_data['json'] = resolved_config['body']
            
            # 用于日志显示的请求数据（包含完整 URL）
            result.request = {
                'method': api_data.method.upper(),
                'url': display_url,  # 显示完整 URL
                'headers': headers,
                'params': query_params,
                'json': request_data.get('json')
            }
            
            # ========== 详细调试信息 ==========
            print(f"\n{'='*80}")
            print(f"[请求调试] 准备发送API请求")
            print(f"[请求调试] URL: {display_url}")
            print(f"[请求调试] Method: {result.request['method']}")
            if query_params:
                print(f"[请求调试] Query参数: {query_params}")
            
            # 检查cookie jar状态
            print(f"\n[Cookie调试] 清理前的Cookie Jar:")
            if self.client.cookies:
                for cookie in self.client.cookies.jar:
                    print(f"  - {cookie.name}={cookie.value} (domain={cookie.domain})")
            else:
                print(f"  (无cookies)")
            
            # 清空客户端的cookie jar，防止自动cookie管理
            # 确保每次请求都只使用平台设置中的cookies
            self.client.cookies.clear()
            
            print(f"\n[Cookie调试] 清理后的Cookie Jar:")
            if self.client.cookies:
                for cookie in self.client.cookies.jar:
                    print(f"  - {cookie.name}={cookie.value}")
            else:
                print(f"  (已清空)")
            
            # 显示实际发送的headers
            print(f"\n[请求调试] 实际发送的Headers:")
            for key, value in headers.items():
                if key.lower() == 'cookie':
                    print(f"  {key}: {value[:200]}..." if len(value) > 200 else f"  {key}: {value}")
                else:
                    print(f"  {key}: {value}")
            
            # 显示请求体
            if result.request.get('json'):
                print(f"\n[请求调试] 请求体:")
                import json
                print(f"  {json.dumps(result.request['json'], indent=2, ensure_ascii=False)}")
            
            print(f"{'='*80}\n")
            
            # 记录请求详情日志
            if step_execution_id and self.database:
                try:
                    request_log = f'{result.request["method"]} {display_url}'
                    if result.request.get('json'):
                        body_str = json.dumps(result.request["json"], ensure_ascii=False, indent=2)
                        if len(body_str) > 500:
                            body_str = body_str[:500] + '...(已截断)'
                        request_log += f'\n请求体: {body_str}'
                    
                    self.database.create_execution_log(
                        level='info',
                        message=request_log,
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='request',
                        details={
                            'url': display_url,
                            'method': result.request['method'],
                            'headers': dict(headers),
                            'params': result.request.get('params'),
                            'body': result.request.get('json')
                        }
                    )
                except Exception as e:
                    print(f"⚠️ 记录请求日志失败: {e}")
            
            # 发送请求
            logger.http_request(api_data.method.upper(), display_url, data={
                'hasCookie': bool(headers.get('Cookie')),
                'hasAuth': bool(headers.get('Authorization')),
            })
            print(f"[请求调试] 🚀 发送请求到: {display_url}")
            print(f"[请求调试] 使用的认证: Cookie头={bool(headers.get('Cookie'))}, Authorization头={bool(headers.get('Authorization'))}")
            
            # 记录请求开始时间
            request_start_time = datetime.now()
            response = await self.client.request(**request_data)
            request_duration = (datetime.now() - request_start_time).total_seconds()
            
            logger.http_response(response.status_code, request_duration * 1000, data={
                'contentLength': len(response.content) if response.content else 0,
            })
            print(f"[请求调试] ✅ 收到响应: {response.status_code}，耗时: {request_duration:.3f}秒")
            
            # 解析响应
            response_data = {
                'status': response.status_code,
                'headers': dict(response.headers),
                'body': None
            }
            
            # 检查响应中的Set-Cookie
            print(f"\n[响应调试] 状态码: {response.status_code}")
            print(f"[响应调试] 响应头中的Set-Cookie:")
            set_cookie_headers = response.headers.get_list('set-cookie')
            if set_cookie_headers:
                for idx, cookie in enumerate(set_cookie_headers):
                    print(f"  [{idx+1}] {cookie[:100]}..." if len(cookie) > 100 else f"  [{idx+1}] {cookie}")
            else:
                print(f"  (无Set-Cookie响应头)")
            
            # 检查Cookie Jar在响应后的状态
            print(f"\n[Cookie调试] 响应后的Cookie Jar:")
            if self.client.cookies:
                for cookie in self.client.cookies.jar:
                    print(f"  - {cookie.name}={cookie.value} (domain={cookie.domain})")
            else:
                print(f"  (无cookies)")
            
            try:
                response_data['body'] = response.json()
            except:
                response_data['body'] = response.text
            
            result.response = response_data
            
            # 保存步骤结果
            variable_manager.set_step_result(node.id, {
                'request': request_data,
                'response': response_data
            })
            
            # 保存请求和响应到数据库
            if step_execution_id and self.database:
                try:
                    print(f"[响应日志] 准备保存响应数据 - stepId: {step_execution_id}, status: {response_data['status']}")
                    
                    # 先更新步骤执行记录
                    self.database.update_step_execution(
                        step_execution_id,
                        requestUrl=request_data['url'],
                        requestMethod=request_data['method'],
                        requestHeaders=request_data.get('headers'),
                        requestBody=request_data.get('json'),
                        requestParams=request_data.get('params'),
                        responseStatus=response_data['status'],
                        responseHeaders=response_data.get('headers'),
                        responseBody=response_data.get('body'),
                        responseTime=int(request_duration * 1000) if 'request_duration' in locals() else None
                    )
                    print(f"[响应日志] ✅ update_step_execution 成功")
                except Exception as update_error:
                    print(f"⚠️ update_step_execution 失败: {update_error}")
                    import traceback
                    traceback.print_exc()
                    
                # 独立的try块用于创建响应日志，即使update失败也要尝试创建日志
                try:
                    # 记录响应日志
                    response_log = f'收到响应: {response_data["status"]}'
                    if response_data.get('body'):
                        body_str = json.dumps(response_data['body'], ensure_ascii=False, indent=2) if isinstance(response_data['body'], (dict, list)) else str(response_data['body'])
                        if len(body_str) > 500:
                            body_str = body_str[:500] + '...(已截断)'
                        response_log += f'\n响应体: {body_str}'
                    
                    print(f"[响应日志] 准备创建ExecutionLog - message长度: {len(response_log)}, case_id: {self.case_execution_id}, suite_id: {self.suite_execution_id}")
                    
                    log_id = self.database.create_execution_log(
                        level='success' if 200 <= response_data['status'] < 300 else 'warning',
                        message=response_log,
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='response',
                        details={
                            'status': response_data['status'],
                            'headers': response_data.get('headers'),
                            'body': response_data.get('body')
                        }
                    )
                    print(f"[响应日志] ✅ create_execution_log 成功 - logId: {log_id}")
                except Exception as log_error:
                    print(f"⚠️ 创建响应日志失败: {log_error}")
                    import traceback
                    traceback.print_exc()
            
            # 提取响应变量
            if api_data.responseExtract:
                extracted = {}
                for extract in api_data.responseExtract:
                    value = variable_manager.extract_from_response(
                        response_data, extract.path
                    )
                    variable_manager.set_variable(extract.variable, value)
                    extracted[extract.variable] = value
                    
                    # 记录变量提取
                    logger.variable_extracted(extract.variable, str(value)[:100], extract.path)
                
                result.extractedVariables = extracted
                
                # 记录变量提取日志
                if step_execution_id and self.database:
                    try:
                        var_log = f'提取了 {len(extracted)} 个变量:'
                        for var_name, var_value in extracted.items():
                            value_str = json.dumps(var_value, ensure_ascii=False) if not isinstance(var_value, str) else var_value
                            if len(value_str) > 100:
                                value_str = value_str[:100] + '...(已截断)'
                            var_log += f'\n  • {var_name} = {value_str}'
                        
                        self.database.create_execution_log(
                            level='success',
                            message=var_log,
                            step_execution_id=step_execution_id,
                            case_execution_id=self.case_execution_id,
                            suite_execution_id=self.suite_execution_id,
                            node_id=node.id,
                            node_name=node.data.get('name'),
                            log_type='variable',
                            details={'variables': extracted}
                        )
                    except Exception as e:
                        print(f"⚠️ 记录变量提取日志失败: {e}")
            
            # 执行断言
            if api_data.assertions:
                print(f"[断言] 开始执行节点 {node.id} 的断言，共 {len(api_data.assertions)} 个")
                print(f"[断言] 响应数据结构: {response_data}")
                
                # 构建完整的断言上下文，包含 status, headers 和 body 的展平数据
                assertion_context = {
                    'status': response_data['status'],
                    'headers': response_data.get('headers', {})
                }
                
                # 如果响应体是字典，将其字段直接放到根层级，同时保留 body 字段
                if isinstance(response_data.get('body'), dict):
                    assertion_context.update(response_data['body'])
                    assertion_context['body'] = response_data['body']
                else:
                    assertion_context['body'] = response_data.get('body')
                
                print(f"[断言] 断言上下文: {assertion_context}")
                
                # 获取断言失败策略
                from models import AssertionFailureStrategy
                stop_on_failure = api_data.assertionFailureStrategy == AssertionFailureStrategy.STOP_ON_FAILURE
                print(f"[断言] 断言失败策略: {api_data.assertionFailureStrategy.value}, 停止于失败: {stop_on_failure}")
                
                assertion_results = assertion_engine.execute_assertions(
                    api_data.assertions,
                    assertion_context,
                    stop_on_failure=stop_on_failure
                )
                result.assertions = [ar.to_dict() for ar in assertion_results]
                print(f"[断言] 节点 {node.id} 断言执行完成: {result.assertions}")
                
                # 记录断言结果到日志
                for ar in assertion_results:
                    logger.assertion_result(
                        f"{ar.field} {ar.operator} {ar.expected}",
                        ar.success,
                        f"实际值: {str(ar.actual)[:50]}" if not ar.success else ""
                    )
                
                # 保存断言结果到数据库
                if step_execution_id and self.database:
                    try:
                        self.database.update_step_execution(
                            step_execution_id,
                            assertionResults=result.assertions
                        )
                        
                        # 记录断言日志
                        passed_count = sum(1 for ar in assertion_results if ar.success)
                        failed_count = len(assertion_results) - passed_count
                        
                        log_level = 'success' if failed_count == 0 else 'error'
                        log_message = f'断言结果: {passed_count} 通过, {failed_count} 失败'
                        
                        # 列出每个断言的详细结果
                        for ar in assertion_results:
                            status_icon = '✅' if ar.success else '❌'
                            log_message += f'\n  {status_icon} {ar.field} {ar.operator} {ar.expected}'
                            if not ar.success:
                                actual_str = json.dumps(ar.actual, ensure_ascii=False) if not isinstance(ar.actual, str) else ar.actual
                                if len(actual_str) > 100:
                                    actual_str = actual_str[:100] + '...'
                                log_message += f' (实际: {actual_str})'
                        
                        self.database.create_execution_log(
                            level=log_level,
                            message=log_message,
                            step_execution_id=step_execution_id,
                            case_execution_id=self.case_execution_id,
                            suite_execution_id=self.suite_execution_id,
                            node_id=node.id,
                            node_name=node.data.get('name'),
                            log_type='assertion',
                            details={
                                'total': len(assertion_results),
                                'passed': passed_count,
                                'failed': failed_count,
                                'results': result.assertions
                            }
                        )
                    except Exception as e:
                        print(f"⚠️ 保存断言结果失败: {e}")
                
                if not assertion_engine.all_passed(assertion_results):
                    result.success = False
                    failed = [ar for ar in assertion_results if not ar.success]
                    result.error = f"断言失败: {failed[0].message}"
                    print(f"[断言] 节点 {node.id} 断言失败: {result.error}")
            
            # 执行等待
            if api_data.wait:
                print(f"[等待] ========== 节点 {node.id} 开始执行等待 ==========")
                print(f"[等待] 当前节点ID: {node.id}")
                print(f"[等待] 等待配置: {api_data.wait.dict()}")
                
                wait_config = WaitConfig(**api_data.wait.dict())
                
                # 如果等待条件引用的是简单字段名（不包含 step_ 或 current 前缀），
                # 使用与断言相同的上下文
                if wait_config.type == WaitType.CONDITION and wait_config.condition:
                    condition_var = wait_config.condition.variable
                    
                    # 判断是否是简单字段名（如 "message", "data.token"）
                    if not condition_var.startswith('step_') and not condition_var.startswith('current'):
                        print(f"[等待] 检测到简单字段名，使用当前响应上下文: {condition_var}")
                        
                        # 构建与断言相同的上下文
                        wait_context = {
                            'status': response_data['status'],
                            'headers': response_data.get('headers', {})
                        }
                        
                        # 如果响应体是字典，将其字段直接放到根层级
                        if isinstance(response_data.get('body'), dict):
                            wait_context.update(response_data['body'])
                            wait_context['body'] = response_data['body']
                        else:
                            wait_context['body'] = response_data.get('body')
                        
                        print(f"[等待] 等待上下文: {wait_context}")
                        
                        # 使用当前响应上下文执行等待
                        wait_success, wait_error = await self._execute_wait_with_context(
                            wait_config, wait_context
                        )
                    else:
                        # 使用变量管理器（引用其他步骤的变量）
                        print(f"[等待] 使用变量管理器解析: {condition_var}")
                        variable_manager.current_step_id = node.id
                        wait_success, wait_error = await self._execute_wait(
                            wait_config, variable_manager
                        )
                else:
                    # 固定时间等待
                    wait_success, wait_error = await self._execute_wait(
                        wait_config, variable_manager
                    )
                
                if not wait_success:
                    result.success = False
                    result.error = wait_error or "等待条件超时"
                    print(f"[等待] 节点 {node.id} 等待失败: {result.error}")
        
        except httpx.TimeoutException as e:
            result.success = False
            result.error = f"API 请求超时"
            print(f"API 请求超时: {str(e)}")
        except httpx.ConnectError as e:
            result.success = False
            result.error = f"API 连接失败: 无法连接到服务器"
            print(f"API 连接失败: {str(e)}")
        except httpx.HTTPStatusError as e:
            result.success = False
            result.error = f"HTTP 错误: {e.response.status_code}"
            print(f"HTTP 错误: {str(e)}")
        except Exception as e:
            result.success = False
            result.error = f"API 请求失败: {type(e).__name__}"
            print(f"API 请求失败: {type(e).__name__}: {str(e)}")
    
    async def _execute_wait_node(
        self,
        node: FlowNode,
        wait_handler: WaitHandler,
        result: StepExecutionResult,
        step_execution_id: Optional[str] = None
    ) -> None:
        """执行等待节点"""
        try:
            # 记录等待节点开始日志
            if step_execution_id and self.database:
                try:
                    self.database.create_execution_log(
                        level='info',
                        message=f'开始执行等待节点',
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='system'
                    )
                except:
                    pass
            
            # 等待节点的数据中包含嵌套的 wait 字段
            wait_data = node.data.get('wait', node.data)
            print(f"[等待节点] 原始数据: {node.data}")
            print(f"[等待节点] wait_data: {wait_data}")
            
            wait_config = WaitConfig(**wait_data)
            
            # 记录等待配置日志
            if step_execution_id and self.database:
                try:
                    wait_log = f'等待类型: {wait_config.type.value}'
                    if wait_config.type == WaitType.FIXED:
                        wait_log += f'\n等待时间: {wait_config.duration}ms'
                    elif wait_config.type == WaitType.CONDITION:
                        wait_log += f'\n等待条件: {wait_config.condition.variable} {wait_config.condition.operator} {wait_config.condition.expected}'
                        wait_log += f'\n最大等待: {wait_config.timeout}ms'
                        wait_log += f'\n检查间隔: {wait_config.interval}ms'
                    
                    self.database.create_execution_log(
                        level='info',
                        message=wait_log,
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='system',
                        details={'wait_config': wait_data}
                    )
                except:
                    pass
            
            # 将等待配置放入 result.request 以便前端显示
            result.request = {
                'wait': wait_data
            }
            
            start_time = datetime.now()
            success, error_msg = await wait_handler.wait(wait_config)
            end_time = datetime.now()
            actual_wait_time = int((end_time - start_time).total_seconds() * 1000)
            
            # 记录等待结果日志
            if step_execution_id and self.database:
                try:
                    if success:
                        log_message = f'等待完成，实际耗时: {actual_wait_time}ms'
                        log_level = 'success'
                    else:
                        log_message = f'等待失败: {error_msg}，耗时: {actual_wait_time}ms'
                        log_level = 'error'
                    
                    self.database.create_execution_log(
                        level=log_level,
                        message=log_message,
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='system',
                        details={'actual_wait_time': actual_wait_time, 'success': success}
                    )
                except:
                    pass
            
            if not success:
                result.success = False
                result.error = error_msg or "等待条件超时"
        
        except Exception as e:
            result.success = False
            result.error = f"等待执行失败: {str(e)}"
            print(f"[等待节点] 执行失败: {str(e)}")
            
            # 记录异常日志
            if step_execution_id and self.database:
                try:
                    self.database.create_execution_log(
                        level='error',
                        message=f'等待节点异常: {str(e)}',
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='error',
                        details={'error': str(e)}
                    )
                except:
                    pass
    
    async def _execute_assertion_node(
        self,
        node: FlowNode,
        variable_manager: VariableManager,
        assertion_engine: AssertionEngine,
        result: StepExecutionResult,
        step_execution_id: Optional[str] = None
    ) -> None:
        """执行断言节点"""
        # 记录断言节点开始日志
        if step_execution_id and self.database:
            try:
                self.database.create_execution_log(
                    level='info',
                    message=f'开始执行断言节点',
                    step_execution_id=step_execution_id,
                    case_execution_id=self.case_execution_id,
                    suite_execution_id=self.suite_execution_id,
                    node_id=node.id,
                    node_name=node.data.get('name'),
                    log_type='system'
                )
            except:
                pass
        try:
            # 获取所有步骤结果，构建断言上下文
            all_variables = variable_manager.get_all_variables()
            print(f"[断言节点] 所有变量: {all_variables}")
            
            # 构建一个包含所有步骤响应的上下文
            assertion_context = {}
            for step_id, step_result in all_variables.get('step_results', {}).items():
                if 'response' in step_result:
                    response_data = step_result['response']
                    # 构建该步骤的展平响应上下文
                    step_context = {
                        'status': response_data.get('status'),
                        'headers': response_data.get('headers', {})
                    }
                    if isinstance(response_data.get('body'), dict):
                        step_context.update(response_data['body'])
                        step_context['body'] = response_data['body']
                    else:
                        step_context['body'] = response_data.get('body')
                    
                    assertion_context[step_id] = {
                        'response': step_context,
                        'request': step_result.get('request', {})
                    }
            
            # 添加全局变量
            assertion_context['variables'] = all_variables.get('variables', {})
            
            print(f"[断言节点] 断言上下文: {assertion_context}")
            
            assertions_data = node.data.get('assertions', [])
            if assertions_data:
                # 将字典转换为 Assertion 对象
                from models import Assertion
                assertions = [Assertion(**assertion_dict) for assertion_dict in assertions_data]
                
                # 断言节点默认策略：遇到失败就停止
                # 可以从 node.data 获取策略配置
                assertion_strategy = node.data.get('assertionFailureStrategy', 'stopOnFailure')
                stop_on_failure = assertion_strategy == 'stopOnFailure'
                print(f"[断言节点] 断言失败策略: {assertion_strategy}, 停止于失败: {stop_on_failure}")
                
                assertion_results = assertion_engine.execute_assertions(
                    assertions,
                    assertion_context,
                    stop_on_failure=stop_on_failure
                )
                result.assertions = [ar.to_dict() for ar in assertion_results]
                
                # 保存断言结果到数据库
                if step_execution_id and self.database:
                    try:
                        # 更新步骤执行记录中的断言结果
                        self.database.update_step_execution(
                            step_execution_id,
                            assertionResults=result.assertions
                        )
                        
                        # 记录详细的断言日志
                        passed_count = sum(1 for ar in assertion_results if ar.success)
                        failed_count = len(assertion_results) - passed_count
                        
                        log_level = 'success' if failed_count == 0 else 'error'
                        log_message = f'断言结果: {passed_count} 通过, {failed_count} 失败'
                        
                        # 列出每个断言的详细结果
                        import json
                        for ar in assertion_results:
                            status_icon = '✅' if ar.success else '❌'
                            log_message += f'\n  {status_icon} {ar.field} {ar.operator} {ar.expected}'
                            if not ar.success:
                                actual_str = json.dumps(ar.actual, ensure_ascii=False) if not isinstance(ar.actual, str) else ar.actual
                                if len(actual_str) > 100:
                                    actual_str = actual_str[:100] + '...'
                                log_message += f' (实际: {actual_str})'
                        
                        self.database.create_execution_log(
                            level=log_level,
                            message=log_message,
                            step_execution_id=step_execution_id,
                            case_execution_id=self.case_execution_id,
                            suite_execution_id=self.suite_execution_id,
                            node_id=node.id,
                            node_name=node.data.get('name'),
                            log_type='assertion',
                            details={
                                'total': len(assertion_results),
                                'passed': passed_count,
                                'failed': failed_count,
                                'results': result.assertions
                            }
                        )
                    except Exception as e:
                        print(f"⚠️ 保存断言结果失败: {e}")
                
                if not assertion_engine.all_passed(assertion_results):
                    result.success = False
                    failed = [ar for ar in assertion_results if not ar.success]
                    result.error = f"断言失败: {failed[0].message}"
        
        except Exception as e:
            result.success = False
            result.error = f"断言执行失败: {str(e)}"
            print(f"[断言节点] 执行失败: {str(e)}")
            
            # 记录异常日志
            if step_execution_id and self.database:
                try:
                    self.database.create_execution_log(
                        level='error',
                        message=f'断言节点执行异常: {str(e)}',
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='error',
                        details={'error': str(e)}
                    )
                except:
                    pass
    
    async def _execute_parallel_node(
        self,
        node: FlowNode,
        variable_manager: VariableManager,
        assertion_engine: AssertionEngine,
        result: StepExecutionResult,
        step_execution_id: Optional[str] = None
    ) -> None:
        """执行并发节点"""
        try:
            parallel_data = ParallelNodeData(**node.data)
            failure_strategy = parallel_data.failureStrategy or 'stopAll'
            print(f"[并发节点] 开始执行并发节点: {node.id}, 包含 {len(parallel_data.apis)} 个API, 失败策略: {failure_strategy}")
            
            # 记录并发节点开始日志
            if step_execution_id and self.database:
                try:
                    self.database.create_execution_log(
                        level='info',
                        message=f'开始执行并发节点，包含 {len(parallel_data.apis)} 个API，失败策略: {failure_strategy}',
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='system'
                    )
                except:
                    pass
            
            # 创建并发任务（Task对象，可以取消）
            tasks = []
            task_to_api_map = {}  # 映射Task到API配置
            
            for api_config in parallel_data.apis:
                task = asyncio.create_task(
                    self._execute_parallel_api(
                        node.id,
                        api_config,
                        variable_manager,
                        assertion_engine
                    )
                )
                tasks.append(task)
                task_to_api_map[task] = api_config
            
            # 根据策略执行
            all_success = True
            errors = []
            parallel_results = {}
            parallel_logs = []
            completed_apis = set()
            
            if failure_strategy == 'stopAll':
                # 策略：任一失败则取消其他
                print(f"[并发节点] 使用 stopAll 策略")
                
                pending = set(tasks)
                while pending:
                    # 等待任一任务完成
                    done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
                    
                    for task in done:
                        api_config = task_to_api_map[task]
                        completed_apis.add(api_config.id)
                        
                        try:
                            api_result = task.result()
                            
                            # 构建日志
                            api_log = self._build_api_log(api_config, api_result, len(completed_apis))
                            parallel_logs.append(api_log)
                            
                            # 记录单个API执行日志到数据库
                            if step_execution_id and self.database:
                                try:
                                    api_status = '成功' if api_result.get('success', False) else '失败'
                                    log_level = 'success' if api_result.get('success', False) else 'error'
                                    log_message = f'并发API [{api_config.name or api_config.id}] {api_status}'
                                    
                                    # 添加请求和响应摘要
                                    if api_result.get('request'):
                                        req = api_result['request']
                                        log_message += f'\n请求: {req.get("method")} {req.get("url")}'
                                    
                                    if api_result.get('response'):
                                        resp = api_result['response']
                                        log_message += f'\n响应: {resp.get("status")}'
                                    
                                    if not api_result.get('success', False):
                                        log_message += f'\n错误: {api_result.get("error", "未知错误")}'
                                    
                                    self.database.create_execution_log(
                                        level=log_level,
                                        message=log_message,
                                        step_execution_id=step_execution_id,
                                        case_execution_id=self.case_execution_id,
                                        suite_execution_id=self.suite_execution_id,
                                        node_id=node.id,
                                        node_name=node.data.get('name'),
                                        log_type='request',
                                        details={
                                            'api_id': api_config.id,
                                            'api_name': api_config.name,
                                            'request': api_result.get('request'),
                                            'response': api_result.get('response'),
                                            'assertions': api_result.get('assertions', [])
                                        }
                                    )
                                except Exception as e:
                                    print(f"⚠️ 记录并发API日志失败: {e}")
                            
                            # 检查结果
                            if not api_result.get('success', False):
                                all_success = False
                                error_msg = api_result.get('error', 'Unknown')
                                errors.append(f"API '{api_config.name or api_config.id}' 失败: {error_msg}")
                                print(f"[并发节点] API失败，取消其他 {len(pending)} 个任务")
                                
                                # 取消所有未完成的任务
                                for pending_task in pending:
                                    pending_task.cancel()
                                    pending_api = task_to_api_map[pending_task]
                                    # 为取消的任务添加日志
                                    cancelled_log = {
                                        'apiId': pending_api.id,
                                        'apiName': pending_api.name or f'API',
                                        'method': pending_api.method,
                                        'url': pending_api.url,
                                        'success': False,
                                        'error': '因其他API失败而被取消',
                                        'request': None,
                                        'response': None,
                                        'assertions': []
                                    }
                                    parallel_logs.append(cancelled_log)
                                
                                pending.clear()
                                break
                            else:
                                # 成功，存储结果
                                parallel_results[api_config.id] = api_result.get('response')
                                
                        except asyncio.CancelledError:
                            api_log = {
                                'apiId': api_config.id,
                                'apiName': api_config.name or f'API',
                                'method': api_config.method,
                                'url': api_config.url,
                                'success': False,
                                'error': '任务被取消',
                                'request': None,
                                'response': None,
                                'assertions': []
                            }
                            parallel_logs.append(api_log)
                        except Exception as e:
                            all_success = False
                            error_msg = f"异常: {str(e)}"
                            errors.append(f"API '{api_config.name or api_config.id}' {error_msg}")
                            api_log = {
                                'apiId': api_config.id,
                                'apiName': api_config.name or f'API',
                                'method': api_config.method,
                                'url': api_config.url,
                                'success': False,
                                'error': error_msg,
                                'request': None,
                                'response': None,
                                'assertions': []
                            }
                            parallel_logs.append(api_log)
                            
                            # 取消其他任务
                            for pending_task in pending:
                                pending_task.cancel()
                            pending.clear()
                            break
            else:
                # 策略：继续执行所有，即使失败
                print(f"[并发节点] 使用 continueAll 策略")
                results_list = await asyncio.gather(*tasks, return_exceptions=True)
                
                for api_config, api_result in zip(parallel_data.apis, results_list):
                    api_log = self._build_api_log(api_config, api_result, len(parallel_logs) + 1)
                    parallel_logs.append(api_log)
                    
                    # 记录单个API执行日志到数据库
                    if step_execution_id and self.database:
                        try:
                            if isinstance(api_result, Exception):
                                log_level = 'error'
                                log_message = f'并发API [{api_config.name or api_config.id}] 异常\n错误: {str(api_result)}'
                            elif not api_result.get('success', False):
                                log_level = 'error'
                                log_message = f'并发API [{api_config.name or api_config.id}] 失败\n错误: {api_result.get("error", "未知错误")}'
                            else:
                                log_level = 'success'
                                log_message = f'并发API [{api_config.name or api_config.id}] 成功'
                                if api_result.get('request'):
                                    req = api_result['request']
                                    log_message += f'\n请求: {req.get("method")} {req.get("url")}'
                                if api_result.get('response'):
                                    resp = api_result['response']
                                    log_message += f'\n响应: {resp.get("status")}'
                            
                            self.database.create_execution_log(
                                level=log_level,
                                message=log_message,
                                step_execution_id=step_execution_id,
                                case_execution_id=self.case_execution_id,
                                suite_execution_id=self.suite_execution_id,
                                node_id=node.id,
                                node_name=node.data.get('name'),
                                log_type='request',
                                details={
                                    'api_id': api_config.id,
                                    'api_name': api_config.name,
                                    'request': api_result.get('request') if not isinstance(api_result, Exception) else None,
                                    'response': api_result.get('response') if not isinstance(api_result, Exception) else None,
                                    'assertions': api_result.get('assertions', []) if not isinstance(api_result, Exception) else []
                                }
                            )
                        except Exception as e:
                            print(f"⚠️ 记录并发API日志失败: {e}")
                    
                    if isinstance(api_result, Exception):
                        all_success = False
                        errors.append(f"API '{api_config.name or api_config.id}' 异常: {str(api_result)}")
                    elif not api_result.get('success', False):
                        all_success = False
                        errors.append(f"API '{api_config.name or api_config.id}' 失败: {api_result.get('error', 'Unknown')}")
                    else:
                        parallel_results[api_config.id] = api_result.get('response')
            
            # 将所有并发API的响应存储到变量管理器
            variable_manager.set_step_result(node.id, {
                'parallel': parallel_results
            })
            
            result.success = all_success
            result.response = {
                'parallel': parallel_results,
                'logs': parallel_logs
            }
            if not all_success:
                result.error = "; ".join(errors)
            
            print(f"[并发节点] 执行完成: success={all_success}, 成功API数={len(parallel_results)}, 总API数={len(parallel_data.apis)}, 执行API数={len(parallel_logs)}")
            
            # 记录并发节点完成日志
            if step_execution_id and self.database:
                try:
                    log_level = 'success' if all_success else 'error'
                    log_message = f'并发节点执行完成: 成功 {len(parallel_results)}/{len(parallel_data.apis)} 个API'
                    if not all_success:
                        log_message += f'\n失败原因: {"; ".join(errors)}'
                    
                    self.database.create_execution_log(
                        level=log_level,
                        message=log_message,
                        step_execution_id=step_execution_id,
                        case_execution_id=self.case_execution_id,
                        suite_execution_id=self.suite_execution_id,
                        node_id=node.id,
                        node_name=node.data.get('name'),
                        log_type='system',
                        details={
                            'total_apis': len(parallel_data.apis),
                            'success_count': len(parallel_results),
                            'failure_strategy': failure_strategy
                        }
                    )
                    
                    # 保存并发节点的响应数据到步骤执行记录
                    self.database.update_step_execution(
                        step_execution_id,
                        responseBody={'parallel': parallel_results, 'logs': parallel_logs}
                    )
                except Exception as e:
                    print(f"⚠️ 记录并发节点完成日志失败: {e}")
        
        except Exception as e:
            result.success = False
            result.error = f"并发执行失败: {str(e)}"
            print(f"[并发节点] 执行异常: {str(e)}")
    
    def _build_api_log(self, api_config, api_result, index: int) -> dict:
        """构建API日志"""
        # 优先使用 api_result 中的实际请求URL（已替换变量），否则使用配置中的原始URL
        actual_url = api_config.url
        if isinstance(api_result, dict) and api_result.get('request'):
            actual_url = api_result['request'].get('url', api_config.url)
        
        api_log = {
            'apiId': api_config.id,
            'apiName': api_config.name or f'API {index}',
            'method': api_config.method,
            'url': actual_url,  # 使用实际请求的URL
            'success': False,
            'request': None,
            'response': None,
            'assertions': [],
            'error': None
        }
        
        if isinstance(api_result, Exception):
            api_log['error'] = f"异常: {str(api_result)}"
        elif not api_result.get('success', False):
            api_log['error'] = api_result.get('error', 'Unknown')
            api_log['request'] = api_result.get('request')
            api_log['response'] = api_result.get('response')
            api_log['assertions'] = api_result.get('assertions', [])
        else:
            api_log['success'] = True
            api_log['request'] = api_result.get('request')
            api_log['response'] = api_result.get('response')
            api_log['assertions'] = api_result.get('assertions', [])
            api_log['extractedVariables'] = api_result.get('extractedVariables')
        
        return api_log
    
    async def _execute_parallel_api(
        self,
        node_id: str,
        api_config,
        variable_manager: VariableManager,
        assertion_engine: AssertionEngine
    ) -> Dict[str, Any]:
        """执行并发节点中的单个 API（与普通API节点配置完全一致）"""
        try:
            # 解析请求配置
            resolved_config = {}
            if api_config.requestConfig:
                resolved_config = variable_manager.resolve_request_config(
                    api_config.requestConfig.dict() if hasattr(api_config.requestConfig, 'dict') else api_config.requestConfig
                )
            
            # 构建 URL
            url = api_config.url
            if resolved_config.get('pathParams'):
                url = variable_manager.replace_url_params(
                    url, resolved_config['pathParams']
                )
            
            # 在URL替换后打印日志，显示替换后的实际URL
            print(f"[并发API] 开始执行: {api_config.name or api_config.id} ({api_config.method} {url})")
            
            # 应用平台设置
            headers = resolved_config.get('headers', {}).copy()
            if self.platform_settings:
                # BaseURL
                if self.platform_settings.get('baseUrl'):
                    base_url = self.platform_settings['baseUrl'].rstrip('/')
                    if url.startswith('http://') or url.startswith('https://'):
                        from urllib.parse import urlparse
                        parsed = urlparse(url)
                        path = parsed.path
                        if parsed.query:
                            path = f"{path}?{parsed.query}"
                        url = f"{base_url}{path}"
                    else:
                        url = f"{base_url}/{url.lstrip('/')}"
                
                # 认证Token
                if self.platform_settings.get('authTokenEnabled'):
                    auth_key = self.platform_settings.get('authTokenKey')
                    auth_value = self.platform_settings.get('authTokenValue')
                    if auth_key and auth_value:
                        headers[auth_key] = auth_value
                
                # Session Cookies
                if self.platform_settings.get('sessionEnabled'):
                    session_cookies = self.platform_settings.get('sessionCookies')
                    if session_cookies:
                        existing_cookie = headers.get('Cookie', '')
                        headers['Cookie'] = f'{existing_cookie}; {session_cookies}' if existing_cookie else session_cookies
            
            # 清空客户端的cookie jar
            self.client.cookies.clear()
            
            # 发送请求
            response = await self.client.request(
                method=api_config.method.upper(),
                url=url,
                headers=headers,
                params=resolved_config.get('queryParams', {}),
                json=resolved_config.get('body')
            )
            
            # 解析响应
            response_data = {
                'status': response.status_code,
                'headers': dict(response.headers),
                'body': None
            }
            
            try:
                response_data['body'] = response.json()
            except:
                response_data['body'] = response.text
            
            print(f"[并发API] 请求成功: {api_config.name or api_config.id}, 状态码: {response.status_code}")
            
            # 提取响应变量
            extracted_variables = {}
            if api_config.responseExtract:
                print(f"[并发API] 开始提取响应变量，共 {len(api_config.responseExtract)} 个")
                for extract in api_config.responseExtract:
                    value = variable_manager.extract_from_response(
                        response_data, extract.path
                    )
                    # 变量路径格式: nodeId.parallel.{api_config.id}.{variable_name}
                    variable_path = f"{node_id}.parallel.{api_config.id}.{extract.variable}"
                    variable_manager.set_variable(variable_path, value)
                    extracted_variables[extract.variable] = value
                    print(f"[并发API] 提取变量: {variable_path} = {value}")
            
            # 构建请求信息（用于日志）
            request_info = {
                'method': api_config.method.upper(),
                'url': url,
                'headers': headers,
                'params': resolved_config.get('queryParams', {}),
                'json': resolved_config.get('body')
            }
            
            # 执行断言
            assertion_results_list = []
            if api_config.assertions:
                print(f"[并发API] 开始执行断言，共 {len(api_config.assertions)} 个")
                
                # 构建断言上下文（与主API节点逻辑一致）
                assertion_context = {
                    'status': response_data['status'],
                    'headers': response_data.get('headers', {})
                }
                
                # 如果响应体是字典，将其字段直接放到根层级
                if isinstance(response_data.get('body'), dict):
                    assertion_context.update(response_data['body'])
                    assertion_context['body'] = response_data['body']
                else:
                    assertion_context['body'] = response_data.get('body')
                
                # 使用配置的断言失败策略
                from models import AssertionFailureStrategy
                stop_on_failure = api_config.assertionFailureStrategy == AssertionFailureStrategy.STOP_ON_FAILURE
                print(f"[并发API] 断言失败策略: {api_config.assertionFailureStrategy.value}, 停止于失败: {stop_on_failure}")
                
                assertion_results = assertion_engine.execute_assertions(
                    api_config.assertions,
                    assertion_context,
                    stop_on_failure=stop_on_failure
                )
                assertion_results_list = [ar.to_dict() for ar in assertion_results]
                
                if not assertion_engine.all_passed(assertion_results):
                    failed = [ar for ar in assertion_results if not ar.success]
                    error_msg = f"断言失败: {failed[0].message if failed else '未知错误'}"
                    print(f"[并发API] {error_msg}")
                    return {
                        'success': False,
                        'error': error_msg,
                        'request': request_info,
                        'response': response_data,
                        'assertions': assertion_results_list
                    }
                
                print(f"[并发API] 所有断言通过")
            
            # 执行等待
            if api_config.wait:
                print(f"[并发API] 开始执行等待配置: {api_config.wait.dict()}")
                wait_config = WaitConfig(**api_config.wait.dict())
                
                # 如果等待条件引用的是简单字段名，使用当前响应上下文
                if wait_config.type == WaitType.CONDITION and wait_config.condition:
                    condition_var = wait_config.condition.variable
                    
                    if not condition_var.startswith('step_') and not condition_var.startswith('current'):
                        # 使用当前响应上下文
                        wait_context = {
                            'status': response_data['status'],
                            'headers': response_data.get('headers', {})
                        }
                        
                        if isinstance(response_data.get('body'), dict):
                            wait_context.update(response_data['body'])
                            wait_context['body'] = response_data['body']
                        else:
                            wait_context['body'] = response_data.get('body')
                        
                        wait_success, wait_error = await self._execute_wait_with_context(
                            wait_config, wait_context
                        )
                    else:
                        # 使用变量管理器
                        wait_success, wait_error = await self._execute_wait(
                            wait_config, variable_manager
                        )
                else:
                    # 固定时间等待
                    wait_success, wait_error = await self._execute_wait(
                        wait_config, variable_manager
                    )
                
                if not wait_success:
                    error_msg = wait_error or "等待条件超时"
                    print(f"[并发API] 等待失败: {error_msg}")
                    return {
                        'success': False,
                        'error': error_msg,
                        'request': request_info,
                        'response': response_data,
                        'assertions': assertion_results_list
                    }
                
                print(f"[并发API] 等待完成")
            
            print(f"[并发API] 执行成功: {api_config.name or api_config.id}")
            return {
                'success': True,
                'request': request_info,
                'response': response_data,
                'assertions': assertion_results_list,
                'extractedVariables': extracted_variables
            }
        
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            print(f"[并发API] 执行异常: {error_msg}")
            return {'success': False, 'error': error_msg}
    
    async def _execute_wait(
        self,
        wait_config: WaitConfig,
        variable_manager: VariableManager
    ) -> tuple[bool, str]:
        """
        执行等待（使用变量管理器）
        
        Returns:
            (是否成功, 错误信息)
        """
        wait_handler = WaitHandler(variable_manager)
        return await wait_handler.wait(wait_config)
    
    async def _execute_wait_with_context(
        self,
        wait_config: WaitConfig,
        context: Dict[str, Any]
    ) -> tuple[bool, str]:
        """
        执行等待（使用当前响应上下文，与断言相同的方式）
        
        Args:
            wait_config: 等待配置
            context: 响应上下文（与断言上下文相同）
        
        Returns:
            (是否成功, 错误信息)
        """
        from wait_handler import WaitHandler
        from variable_manager import VariableManager
        
        # 创建一个临时变量管理器
        temp_vm = VariableManager()
        wait_handler = WaitHandler(temp_vm)
        
        # 修改等待处理器，让它直接从上下文中获取值
        return await wait_handler.wait_with_context(wait_config, context)

