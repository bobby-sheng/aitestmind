'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock, Calendar, Repeat } from 'lucide-react';

interface ScheduleConfig {
  type: 'once' | 'recurring';
  executeAt?: string; // ISO 8601 datetime for 'once'
  frequency?: 'daily' | 'weekly' | 'monthly'; // for 'recurring'
  time?: string; // HH:mm format
  weekdays?: number[]; // 0-6, 0=Monday
  dayOfMonth?: number; // 1-31
  timezone?: string;
}

interface ScheduleConfigProps {
  value: ScheduleConfig | null;
  onChange: (config: ScheduleConfig | null) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function ScheduleConfig({
  value,
  onChange,
  enabled,
  onEnabledChange,
}: ScheduleConfigProps) {
  const t = useTranslations('testSuites');
  const locale = useLocale();
  
  // 时区选项（使用国际化）
  const TIMEZONE_OPTIONS = [
    { value: 'Asia/Shanghai', label: t('chinaTime') },
    { value: 'Asia/Tokyo', label: t('japanTime') },
    { value: 'Asia/Hong_Kong', label: t('hongKongTime') },
    { value: 'America/New_York', label: t('newYorkTime') },
    { value: 'America/Los_Angeles', label: t('losAngelesTime') },
    { value: 'Europe/London', label: t('londonTime') },
    { value: 'Europe/Paris', label: t('parisTime') },
  ];

  // 星期选项（使用国际化）
  const WEEKDAY_OPTIONS = [
    { value: 0, label: t('monday') },
    { value: 1, label: t('tuesday') },
    { value: 2, label: t('wednesday') },
    { value: 3, label: t('thursday') },
    { value: 4, label: t('friday') },
    { value: 5, label: t('saturday') },
    { value: 6, label: t('sunday') },
  ];
  
  const [scheduleType, setScheduleType] = useState<'once' | 'recurring'>(
    value?.type || 'once'
  );
  
  // 将 executeAt 拆分为日期和时间
  const [executeDate, setExecuteDate] = useState<string>(() => {
    if (value?.executeAt) {
      return value.executeAt.slice(0, 10); // YYYY-MM-DD
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  
  const [executeTime, setExecuteTime] = useState<string>(() => {
    if (value?.executeAt) {
      return value.executeAt.slice(11, 16); // HH:mm
    }
    return '09:00';
  });
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
    value?.frequency || 'daily'
  );
  const [time, setTime] = useState<string>(value?.time || '09:00');
  const [weekdays, setWeekdays] = useState<number[]>(value?.weekdays || [0, 1, 2, 3, 4]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(value?.dayOfMonth || 1);
  const [timezone, setTimezone] = useState<string>(
    value?.timezone || 'Asia/Shanghai'
  );

  // 当任何配置改变时，更新父组件
  useEffect(() => {
    if (!enabled) {
      onChange(null);
      return;
    }

    if (scheduleType === 'once') {
      if (executeDate && executeTime) {
        const dateTime = `${executeDate}T${executeTime}:00`;
        onChange({
          type: 'once',
          executeAt: new Date(dateTime).toISOString(),
          timezone,
        });
      }
    } else {
      const config: ScheduleConfig = {
        type: 'recurring',
        frequency,
        time,
        timezone,
      };

      if (frequency === 'weekly') {
        config.weekdays = weekdays;
      } else if (frequency === 'monthly') {
        config.dayOfMonth = dayOfMonth;
      }

      onChange(config);
    }
  }, [
    enabled,
    scheduleType,
    executeDate,
    executeTime,
    frequency,
    time,
    weekdays,
    dayOfMonth,
    timezone,
  ]);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>{t('scheduleConfigTitle')}</CardTitle>
          </div>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          {/* 调度类型 */}
          <div className="space-y-2">
            <Label>{t('scheduleType')}</Label>
            <Select
              value={scheduleType}
              onValueChange={(value: 'once' | 'recurring') =>
                setScheduleType(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{t('scheduleTypeOnce')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="recurring">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    <span>{t('scheduleTypeRecurring')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 绝对时间配置 */}
          {scheduleType === 'once' && (
            <>
              <div className="space-y-2">
                <Label>{t('executeTime')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {locale === 'zh' ? '日期' : 'Date'}
                    </Label>
                    <Input
                      type="date"
                      value={executeDate}
                      onChange={(e) => setExecuteDate(e.target.value)}
                      onClick={(e) => {
                        const input = e.currentTarget;
                        try {
                          input.showPicker?.();
                        } catch (error) {
                          // Fallback for browsers that don't support showPicker
                          input.focus();
                        }
                      }}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full cursor-pointer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {locale === 'zh' ? '时间' : 'Time'}
                    </Label>
                    <Input
                      type="time"
                      value={executeTime}
                      onChange={(e) => setExecuteTime(e.target.value)}
                      onClick={(e) => {
                        const input = e.currentTarget;
                        try {
                          input.showPicker?.();
                        } catch (error) {
                          // Fallback for browsers that don't support showPicker
                          input.focus();
                        }
                      }}
                      className="w-full cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('selectExecuteTime')}
                </p>
              </div>
            </>
          )}

          {/* 周期时间配置 */}
          {scheduleType === 'recurring' && (
            <>
              {/* 重复频率 */}
              <div className="space-y-2">
                <Label>{t('repeatFrequency')}</Label>
                <Select
                  value={frequency}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                    setFrequency(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('daily')}</SelectItem>
                    <SelectItem value="weekly">{t('weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 星期几选择 (仅周执行) */}
              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>{t('selectWeekday')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleWeekday(day.value)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          weekdays.includes(day.value)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('selectWeekdayDesc')}
                  </p>
                </div>
              )}

              {/* 每月日期选择 */}
              {frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>{t('dayOfMonth')}</Label>
                  <Select
                    value={String(dayOfMonth)}
                    onValueChange={(value) => setDayOfMonth(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}{t('dayOfMonthSuffix') && ` ${t('dayOfMonthSuffix')}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 执行时间 */}
              <div className="space-y-2">
                <Label>{t('executionTime')}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  onClick={(e) => {
                    const input = e.currentTarget;
                    try {
                      input.showPicker?.();
                    } catch (error) {
                      // Fallback for browsers that don't support showPicker
                      input.focus();
                    }
                  }}
                  className="cursor-pointer"
                />
              </div>
            </>
          )}

          {/* 时区选择 */}
          <div className="space-y-2">
            <Label>{t('timezone')}</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 预览下次执行时间 */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">{t('configPreview')}</p>
            {scheduleType === 'once' ? (
              <p className="text-muted-foreground">
                {executeDate && executeTime
                  ? t('executeOnce', {
                      time: new Date(`${executeDate}T${executeTime}`).toLocaleString(
                        locale === 'zh' ? 'zh-CN' : 'en-US',
                        {
                          timeZone: timezone,
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      ),
                    })
                  : t('selectExecuteDateTime')}
              </p>
            ) : (
              <p className="text-muted-foreground">
                {frequency === 'daily' && t('executeDaily', { time })}
                {frequency === 'weekly' &&
                  t('executeWeekly', {
                    weekdays: weekdays.map((d) => WEEKDAY_OPTIONS[d].label).join(t('weekdaySeparator')),
                    time,
                  })}
                {frequency === 'monthly' && t('executeMonthly', { day: dayOfMonth, time })}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{t('timezone')}: {timezone}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

