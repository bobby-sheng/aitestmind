"""
测试套件调度器 - 支持定时和周期性执行测试套件
"""
import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import pytz
import json
from typing import Dict, Any, Optional
from database import Database
from suite_executor import SuiteExecutor


class TestSuiteScheduler:
    """测试套件调度器"""
    
    def __init__(self, database: Database):
        self.database = database
        self.scheduler = AsyncIOScheduler(timezone='Asia/Shanghai')
        self.suite_executor = SuiteExecutor(database)
        print("🕐 初始化测试套件调度器...")
    
    async def initialize(self):
        """初始化调度器，从数据库加载所有活动的调度任务"""
        try:
            print(f"\n{'='*60}")
            print("📋 加载调度任务...")
            print(f"{'='*60}\n")
            
            # 从数据库加载所有需要调度的测试套件
            suites = self.database.get_scheduled_suites()
            
            if not suites:
                print("ℹ️  当前没有需要调度的测试套件")
            else:
                print(f"✅ 找到 {len(suites)} 个需要调度的测试套件\n")
                
                for suite in suites:
                    try:
                        await self.register_schedule(suite)
                        print(f"  ✓ 已注册调度: {suite['name']}")
                    except Exception as e:
                        print(f"  ✗ 注册调度失败 {suite['name']}: {e}")
            
            # 启动调度器
            self.scheduler.start()
            
            # 调度器启动后，更新所有任务的下次执行时间
            for job in self.scheduler.get_jobs():
                try:
                    next_run_time = getattr(job, 'next_run_time', None)
                    if next_run_time:
                        self.database.update_suite_next_run_time(job.id, next_run_time)
                        print(f"  📅 {job.name}: 下次执行 {next_run_time.strftime('%Y-%m-%d %H:%M:%S')}")
                except Exception as e:
                    print(f"  ⚠️ 更新 {job.name} 下次执行时间失败: {e}")
            
            print(f"\n{'='*60}")
            print(f"✅ 调度器已启动，当前任务数: {len(self.scheduler.get_jobs())}")
            print(f"{'='*60}\n")
            
        except Exception as e:
            print(f"❌ 调度器初始化失败: {e}")
            import traceback
            traceback.print_exc()
    
    async def register_schedule(self, suite_data: dict):
        """
        注册调度任务
        
        Args:
            suite_data: 测试套件数据，包含 id, name, scheduleConfig 等
        """
        suite_id = suite_data['id']
        schedule_config_str = suite_data.get('scheduleConfig')
        
        if not schedule_config_str:
            print(f"⚠️  测试套件 {suite_data['name']} 没有调度配置")
            return
        
        # 解析调度配置
        try:
            schedule_config = json.loads(schedule_config_str)
        except json.JSONDecodeError as e:
            print(f"❌ 调度配置解析失败: {e}")
            return
        
        # 移除已存在的任务
        if self.scheduler.get_job(suite_id):
            self.scheduler.remove_job(suite_id)
        
        # 根据调度类型创建触发器
        trigger = self._create_trigger(schedule_config)
        
        if not trigger:
            print(f"⚠️  无法为测试套件 {suite_data['name']} 创建触发器")
            return
        
        # 添加调度任务
        job = self.scheduler.add_job(
            func=self._execute_scheduled_suite,
            trigger=trigger,
            args=[suite_id, suite_data['name']],
            id=suite_id,
            name=suite_data['name'],
            replace_existing=True
        )
        
        # 更新下次执行时间（安全访问 next_run_time）
        try:
            next_run_time = getattr(job, 'next_run_time', None)
            if next_run_time:
                self.database.update_suite_next_run_time(suite_id, next_run_time)
                print(f"    下次执行: {next_run_time.strftime('%Y-%m-%d %H:%M:%S')}")
            else:
                # 调度器未启动时，next_run_time 可能为 None
                # 调度器启动后会自动计算
                print(f"    调度任务已添加，等待调度器启动后计算执行时间")
        except Exception as e:
            print(f"    ⚠️ 获取下次执行时间失败: {e}，任务已添加")
    
    def _create_trigger(self, config: dict) -> Optional[Any]:
        """
        根据配置创建调度触发器
        
        Args:
            config: 调度配置字典
            
        Returns:
            DateTrigger 或 CronTrigger 对象
        """
        try:
            schedule_type = config.get('type')
            timezone_str = config.get('timezone', 'Asia/Shanghai')
            timezone = pytz.timezone(timezone_str)
            
            if schedule_type == 'once':
                # 绝对时间：执行一次
                execute_at_str = config.get('executeAt')
                if not execute_at_str:
                    print("❌ 缺少 executeAt 字段")
                    return None
                
                # 解析时间字符串（兼容两种格式）：
                # 1) 'YYYY-MM-DDTHH:mm:ss'（无时区，按 timezone 解释）
                # 2) ISO 8601（含 Z 或偏移，表示绝对时刻）
                execute_at = datetime.fromisoformat(execute_at_str.replace('Z', '+00:00'))

                # 统一对齐到配置时区
                if execute_at.tzinfo is None:
                    execute_at = timezone.localize(execute_at)
                else:
                    execute_at = execute_at.astimezone(timezone)

                # 如果时间已经过去，给出清晰提示（APScheduler 不会“补跑” DateTrigger）
                now_in_tz = datetime.now(timezone)
                if execute_at <= now_in_tz:
                    print(
                        f"⚠️  一次性调度时间已过期: {execute_at.strftime('%Y-%m-%d %H:%M:%S %Z')} "
                        f"(当前时间: {now_in_tz.strftime('%Y-%m-%d %H:%M:%S %Z')})"
                    )

                return DateTrigger(run_date=execute_at, timezone=timezone)
            
            elif schedule_type == 'recurring':
                # 周期时间：重复执行
                frequency = config.get('frequency')
                time_str = config.get('time', '00:00')
                time_parts = time_str.split(':')
                hour = int(time_parts[0])
                minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                
                if frequency == 'daily':
                    # 每天执行
                    return CronTrigger(
                        hour=hour,
                        minute=minute,
                        timezone=timezone
                    )
                
                elif frequency == 'weekly':
                    # 每周执行（指定星期几）
                    weekdays = config.get('weekdays', [])
                    if not weekdays:
                        print("❌ 周期执行缺少 weekdays 字段")
                        return None
                    
                    # 将星期几数组转换为字符串 (0=周一, 6=周日)
                    weekdays_str = ','.join(str(d) for d in weekdays)
                    
                    return CronTrigger(
                        day_of_week=weekdays_str,
                        hour=hour,
                        minute=minute,
                        timezone=timezone
                    )
                
                elif frequency == 'monthly':
                    # 每月执行（指定日期）
                    day_of_month = config.get('dayOfMonth')
                    if not day_of_month:
                        print("❌ 月度执行缺少 dayOfMonth 字段")
                        return None
                    
                    return CronTrigger(
                        day=day_of_month,
                        hour=hour,
                        minute=minute,
                        timezone=timezone
                    )
                
                else:
                    print(f"❌ 不支持的频率类型: {frequency}")
                    return None
            
            else:
                print(f"❌ 不支持的调度类型: {schedule_type}")
                return None
                
        except Exception as e:
            print(f"❌ 创建触发器失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _execute_scheduled_suite(self, suite_id: str, suite_name: str):
        """
        执行调度的测试套件（通过调用 Next.js API）
        
        Args:
            suite_id: 测试套件ID
            suite_name: 测试套件名称
        """
        try:
            print(f"\n{'='*60}")
            print(f"🕐 触发调度执行")
            print(f"套件ID: {suite_id}")
            print(f"套件名称: {suite_name}")
            print(f"触发时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"{'='*60}\n")
            
            # 获取测试套件详细信息
            suite = self.database.get_test_suite(suite_id)
            if not suite:
                print(f"❌ 测试套件不存在: {suite_id}")
                return
            
            # 检查调度状态
            if suite.get('scheduleStatus') != 'active':
                print(f"⚠️  测试套件调度状态非激活，跳过执行: {suite.get('scheduleStatus')}")
                return
            
            # 检查是否有正在执行的任务（防止并发执行）
            running_executions = self.database.get_running_executions(suite_id)
            if running_executions:
                print(f"⚠️  测试套件 {suite_name} 正在执行中，跳过本次调度")
                print(f"    正在执行的任务ID: {[e['id'] for e in running_executions]}")
                return
            
            # 更新上次执行时间
            self.database.update_suite_last_run_time(suite_id, datetime.now())
            
            # 调用 Next.js API 执行测试套件（而不是直接执行）
            print(f"🚀 调用 Next.js API 执行测试套件...\n")
            
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 使用环境变量配置 Next.js 服务地址，默认端口与 package.json 中保持一致 (3009)
                next_base_url = os.getenv("NEXT_API_BASE_URL", "http://localhost:3009")
                response = await client.post(
                    f'{next_base_url}/api/test-suites/{suite_id}/execute',
                    json={'triggered_by': 'schedule'}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ 执行请求已发送")
                    print(f"执行ID: {result.get('data', {}).get('executionId')}")
                    print(f"总用例数: {result.get('data', {}).get('totalCases')}")
                    print(f"总步骤数: {result.get('data', {}).get('totalSteps')}")
                else:
                    print(f"❌ 执行请求失败: HTTP {response.status_code}")
                    print(f"错误信息: {response.text}")
            
            print(f"\n{'='*60}")
            print(f"✅ 调度触发完成（实际执行由 Next.js 处理）")
            print(f"{'='*60}\n")
            
            # 获取调度配置
            schedule_config = json.loads(suite.get('scheduleConfig', '{}'))
            
            if schedule_config.get('type') == 'once':
                # 如果是一次性调度，执行后自动禁用
                self.database.disable_suite_schedule(suite_id)
                # 一次性调度执行后 APScheduler 会自动移除 job，所以我们只需要检查它是否还存在
                try:
                    if self.scheduler.get_job(suite_id):
                        self.scheduler.remove_job(suite_id)
                except Exception as e:
                    print(f"⚠️  移除调度任务时出错（可能已自动移除）: {e}")
                print(f"📝 一次性调度已完成，已自动禁用\n")
            else:
                # 周期性调度：更新下次执行时间
                try:
                    job = self.scheduler.get_job(suite_id)
                    if job:
                        next_run_time = getattr(job, 'next_run_time', None)
                        if next_run_time:
                            self.database.update_suite_next_run_time(suite_id, next_run_time)
                            print(f"📅 下次执行时间: {next_run_time.strftime('%Y-%m-%d %H:%M:%S')}")
                        else:
                            print(f"⚠️  无法获取下次执行时间")
                    else:
                        print(f"⚠️  调度任务不存在，可能已被移除")
                except Exception as e:
                    print(f"⚠️  更新下次执行时间失败: {e}")
            
        except Exception as e:
            print(f"❌ 调度执行失败: {e}")
            import traceback
            traceback.print_exc()
    
    async def update_schedule(self, suite_id: str, suite_data: dict):
        """
        更新调度任务
        
        Args:
            suite_id: 测试套件ID
            suite_data: 测试套件数据
        """
        print(f"🔄 更新调度任务: {suite_data.get('name', suite_id)}")
        await self.register_schedule(suite_data)
    
    def remove_schedule(self, suite_id: str):
        """
        移除调度任务
        
        Args:
            suite_id: 测试套件ID
        """
        if self.scheduler.get_job(suite_id):
            self.scheduler.remove_job(suite_id)
            print(f"🗑️  已移除调度: {suite_id}")
            return True
        return False
    
    def pause_schedule(self, suite_id: str):
        """
        暂停调度任务
        
        Args:
            suite_id: 测试套件ID
        """
        if self.scheduler.get_job(suite_id):
            self.scheduler.pause_job(suite_id)
            print(f"⏸️  已暂停调度: {suite_id}")
            return True
        return False
    
    def resume_schedule(self, suite_id: str):
        """
        恢复调度任务
        
        Args:
            suite_id: 测试套件ID
        """
        if self.scheduler.get_job(suite_id):
            self.scheduler.resume_job(suite_id)
            print(f"▶️  已恢复调度: {suite_id}")
            return True
        return False
    
    def get_schedule_info(self, suite_id: str) -> Optional[Dict[str, Any]]:
        """
        获取调度任务信息
        
        Args:
            suite_id: 测试套件ID
            
        Returns:
            调度任务信息字典，如果不存在则返回 None
        """
        job = self.scheduler.get_job(suite_id)
        if job:
            next_run_time = getattr(job, 'next_run_time', None)
            return {
                'id': job.id,
                'name': job.name,
                'next_run_time': next_run_time.isoformat() if next_run_time else None,
                'trigger': str(job.trigger)
            }
        return None
    
    def get_all_schedules(self) -> list:
        """
        获取所有调度任务
        
        Returns:
            调度任务列表
        """
        jobs = self.scheduler.get_jobs()
        result = []
        for job in jobs:
            next_run_time = getattr(job, 'next_run_time', None)
            result.append({
                'id': job.id,
                'name': job.name,
                'next_run_time': next_run_time.isoformat() if next_run_time else None,
                'trigger': str(job.trigger)
            })
        return result
    
    def shutdown(self):
        """关闭调度器"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            print("🛑 调度器已停止")

