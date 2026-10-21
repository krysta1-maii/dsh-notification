/**
 * `notification` locale namespace: the settings-section copy and the system
 * notification/in-app reminder titles, bodies, and actions. Chinese is the
 * product copy; English mirrors it.
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'nav': '通知',
  'settings.title': '任务完成通知',
  'settings.subtitle': '当 DSH 完成操作或等待交互时，通过系统通知或应用内提醒通知你；可以用关键词规则控制哪些完成需要提醒。',
  'settings.enabled': '启用通知',
  'settings.enabledDesc': '关闭后不会弹出任何通知，规则与偏好设置仍会保留。',
  'settings.permission.title': '浏览器权限',
  'settings.permission.desc': '系统通知需要浏览器授权，应用内提醒无需此权限。点击下方按钮授权，然后发送一条系统测试通知。',
  'settings.permission.granted': '已授权',
  'settings.permission.denied': '已拒绝（请在浏览器地址栏的站点设置中重新开启）',
  'settings.permission.default': '未授权',
  'settings.permission.defaultHint': '系统通知权限尚未授予：点击「请求通知权限」，并在浏览器提示中选择允许；应用内提醒不受此权限影响。',
  'settings.permission.deniedHint': '系统通知权限已被拒绝：请在浏览器地址栏左侧的站点设置中重新开启；应用内提醒不受此权限影响。',
  'settings.permission.request': '请求通知权限',
  'settings.permission.test': '发送测试通知',
  'settings.permission.testSent': '测试通知请求已发送。如果没有看到通知，请检查浏览器站点权限、系统通知设置以及专注或勿扰模式。',
  'settings.permission.testFailed': '浏览器无法创建测试通知：{message}',
  'settings.when.title': '通知时机',
  'settings.when.subtitle': '选择哪些结束状态触发通知。',
  'settings.when.completed': '正常完成',
  'settings.when.error': '出错',
  'settings.when.aborted': '被中止',
  'settings.when.blocked': '被阻塞',
  'settings.when.maxTokens': '达到 Token 上限',
  'settings.pending.title': '等待确认',
  'settings.pending.subtitle': '当 DSH 等待你审批、回答问题或评审计划时提醒。',
  'settings.pending.approval': '等待审批',
  'settings.pending.question': '等待回答问题',
  'settings.pending.planReview': '等待计划评审',
  'settings.rules.title': '关键词规则',
  'settings.rules.subtitle': '规则匹配该轮回复文本与调用过的工具名。包含规则：命中任一才通知；排除规则：命中即不通知。',
  'settings.rules.empty': '暂无规则，所有已启用的完成状态都会通知。',
  'settings.rules.add': '添加规则',
  'settings.rules.save': '保存规则',
  'settings.rules.mode.include': '包含',
  'settings.rules.mode.exclude': '排除',
  'settings.rules.patternPlaceholder': '关键词或正则表达式',
  'settings.rules.regex': '正则',
  'settings.rules.case': '区分大小写',
  'settings.rules.remove': '删除规则',
  'settings.rules.invalid': '规则模式不能为空',
  'settings.rules.invalidRegex': '无效的正则表达式',
  'settings.rules.unsaved': '规则有未保存的修改',
  'settings.rules.saveHint': '先填写规则模式，再点保存',
  'settings.advanced.title': '高级',
  'settings.advanced.requireInteraction': '需要手动关闭',
  'settings.advanced.requireInteractionDesc': '开启后，应用内提醒不自动消失，可打开或关闭；最多保留五条，超出时移除最早的一条。系统通知请求保持显示（取决于浏览器与系统支持）。',
  'settings.advanced.backgroundOnly': '后台系统通知，前台应用内提醒',
  'settings.advanced.backgroundOnlyDesc': '开启时，完成与等待交互共用此规则：窗口隐藏或失焦时，所有会话都使用系统通知（须已授权）；窗口可见且有焦点时，仅为非主视图会话显示可点击跳转、可关闭的应用内提醒，无需系统通知权限，主视图会话不提醒。关闭后前后台所有会话均使用系统通知，包括当前会话。测试始终使用系统通知并绕过此项；退出程序或销毁渲染页面后无法提醒。',
  'notify.titleCompleted': 'DSH 已完成任务',
  'notify.titleError': 'DSH 出错了',
  'notify.titleAborted': 'DSH 已中止',
  'notify.titleBlocked': 'DSH 需要处理',
  'notify.titleMaxTokens': 'DSH 达到 Token 上限',
  'notify.titleApproval': 'DSH 需要你的审批',
  'notify.titleQuestion': 'DSH 需要你的回答',
  'notify.titlePlanReview': 'DSH 需要你评审计划',
  'notify.pendingBody': '有待处理的操作',
  'notify.emptyBody': '任务已完成',
  'notify.open': '打开对话',
  'notify.dismiss': '关闭提醒',
  'notify.inAppLabel': '对话提醒',
  'notify.testTitle': 'DSH 通知测试',
  'notify.testBody': '如果你看到这条通知，说明通知已配置成功。',
} satisfies Record<string, string>

/** The `notification` namespace key union. */
export type NotificationKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'nav': 'Notifications',
  'settings.title': 'Task completion notifications',
  'settings.subtitle': 'Get system notifications or in-app reminders when DSH finishes an operation or waits for input, with keyword rules to filter completions.',
  'settings.enabled': 'Enable notifications',
  'settings.enabledDesc': 'Turning this off stops every notification; rules and preferences are kept.',
  'settings.permission.title': 'Browser permission',
  'settings.permission.desc': 'System notifications need browser permission; in-app reminders do not. Grant it below, then send a system test notification.',
  'settings.permission.granted': 'Granted',
  'settings.permission.denied': 'Denied (re-enable in the browser\'s site settings)',
  'settings.permission.default': 'Not granted',
  'settings.permission.defaultHint': 'System notification permission is not granted yet: click Request permission and allow it in the browser prompt. In-app reminders are unaffected.',
  'settings.permission.deniedHint': 'System notification permission was denied: re-enable it in the browser\'s site settings. In-app reminders are unaffected.',
  'settings.permission.request': 'Request permission',
  'settings.permission.test': 'Send test notification',
  'settings.permission.testSent': 'The test notification was requested. If it is not visible, check the browser site permission, system notification settings, and Focus or Do Not Disturb mode.',
  'settings.permission.testFailed': 'The browser could not create the test notification: {message}',
  'settings.when.title': 'When to notify',
  'settings.when.subtitle': 'Choose which end states trigger a notification.',
  'settings.when.completed': 'Completed',
  'settings.when.error': 'Failed',
  'settings.when.aborted': 'Aborted',
  'settings.when.blocked': 'Blocked',
  'settings.when.maxTokens': 'Hit token limit',
  'settings.pending.title': 'Awaiting confirmation',
  'settings.pending.subtitle': 'Get notified when DSH waits for your approval, answer, or plan review.',
  'settings.pending.approval': 'Awaiting approval',
  'settings.pending.question': 'Awaiting an answer',
  'settings.pending.planReview': 'Awaiting plan review',
  'settings.rules.title': 'Keyword rules',
  'settings.rules.subtitle': 'Rules match the turn\'s reply text and called tool names. Include rules: notify only if one matches. Exclude rules: suppress on match.',
  'settings.rules.empty': 'No rules yet — every enabled end state notifies.',
  'settings.rules.add': 'Add rule',
  'settings.rules.save': 'Save rules',
  'settings.rules.mode.include': 'Include',
  'settings.rules.mode.exclude': 'Exclude',
  'settings.rules.patternPlaceholder': 'Keyword or regular expression',
  'settings.rules.regex': 'Regex',
  'settings.rules.case': 'Case sensitive',
  'settings.rules.remove': 'Remove rule',
  'settings.rules.invalid': 'Rule pattern must not be empty',
  'settings.rules.invalidRegex': 'Invalid regular expression',
  'settings.rules.unsaved': 'Rules have unsaved changes',
  'settings.rules.saveHint': 'Fill in the rule pattern first, then save',
  'settings.advanced.title': 'Advanced',
  'settings.advanced.requireInteraction': 'Require manual dismiss',
  'settings.advanced.requireInteractionDesc': 'Disable automatic expiry for in-app toasts; open or dismiss to remove them. Only five are kept, so an additional toast evicts the oldest. Request persistent system notifications (browser/OS support varies).',
  'settings.advanced.backgroundOnly': 'System notifications in background, in-app toasts in foreground',
  'settings.advanced.backgroundOnlyDesc': 'When on, completion and pending reminders share this rule: hidden or unfocused windows use system notifications for any session (permission required). Visible, focused windows show clickable, dismissible in-app toasts only for conversations outside the main view, without OS notification permission; the main-view conversation is suppressed. Turn this off to use system notifications in foreground and background, including the current conversation. Tests always use system notifications and bypass this setting. Reminders stop if the app exits or the renderer is destroyed.',
  'notify.titleCompleted': 'DSH finished',
  'notify.titleError': 'DSH failed',
  'notify.titleAborted': 'DSH aborted',
  'notify.titleBlocked': 'DSH needs attention',
  'notify.titleMaxTokens': 'DSH hit the token limit',
  'notify.titleApproval': 'DSH needs your approval',
  'notify.titleQuestion': 'DSH needs your answer',
  'notify.titlePlanReview': 'DSH needs your plan review',
  'notify.pendingBody': 'There is a pending action',
  'notify.emptyBody': 'The task is done',
  'notify.open': 'Open conversation',
  'notify.dismiss': 'Dismiss notification',
  'notify.inAppLabel': 'Conversation notifications',
  'notify.testTitle': 'DSH notification test',
  'notify.testBody': 'If you can see this notification, notifications are configured correctly.',
} satisfies Record<NotificationKey, string>

/** Locale namespace id registered under ctx.locale. */
export const NS = 'notification'

/**
 * Fill one dictionary template's `{name}`-style placeholders.
 * @param template - dictionary text.
 * @param params - placeholder values; absent params replace nothing.
 * @returns the filled text.
 */
export function fmt(template: string, params?: Record<string, string>): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => params[key] ?? whole)
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The notification settings copy and titles. */
    [NS]: NotificationKey
  }
}
