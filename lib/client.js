window.__ModuleLoader__.load({ id: 'dsh-notification', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/SettingsSection.tsx
var import_react = require("react");

// src/client/notifier.ts
function titleKey(reason) {
  switch (reason) {
    case "completed":
      return "notify.titleCompleted";
    case "error":
      return "notify.titleError";
    case "aborted":
      return "notify.titleAborted";
    case "blocked":
      return "notify.titleBlocked";
    case "max-tokens":
      return "notify.titleMaxTokens";
  }
}
function pendingTitleKey(kind) {
  switch (kind) {
    case "approval":
      return "notify.titleApproval";
    case "question":
      return "notify.titleQuestion";
    case "plan-review":
      return "notify.titlePlanReview";
  }
}
function bodyText(body, emptyBody) {
  const trimmed = body.trim();
  return trimmed === "" ? emptyBody : trimmed;
}
function notificationSurface(permission, backgroundOnly, documentHidden, documentFocused, sessionInView) {
  if (!backgroundOnly || documentHidden || !documentFocused) {
    return permission === "granted" ? "system" : "none";
  }
  return sessionInView ? "none" : "in-app";
}
function notificationTag(sessionId, turn) {
  return `dsh-notification-${sessionId}-${turn}`;
}
function pendingNotificationTag(sessionId, sequence) {
  return `dsh-notification-pending-${sessionId}-${sequence}`;
}
function notificationsApi() {
  return typeof Notification === "undefined" ? void 0 : Notification;
}
function createBrowserNotification(api, title, options) {
  if (api === void 0) return { ok: false, message: "The Notification API is unavailable in this browser context." };
  if (api.permission !== "granted") return { ok: false, message: "Notification permission is not granted." };
  try {
    return { ok: true, notification: new api(title, options) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

// src/client/rules.ts
function mintRuleId() {
  return crypto.randomUUID();
}
function emptyRule() {
  return { id: mintRuleId(), enabled: true, mode: "include", pattern: "", isRegex: false, caseSensitive: false };
}
function ruleError(rule) {
  if (rule.pattern.trim() === "") return "settings.rules.invalid";
  if (rule.isRegex) {
    try {
      new RegExp(rule.pattern);
    } catch {
      return "settings.rules.invalidRegex";
    }
  }
  return void 0;
}
function firstRuleError(rules) {
  for (let index = 0; index < rules.length; index++) {
    const key = ruleError(rules[index]);
    if (key !== void 0) return { index, key };
  }
  return void 0;
}
function patchRule(rules, id, patch) {
  return rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule);
}
function removeRule(rules, id) {
  return rules.filter((rule) => rule.id !== id);
}

// src/client/SettingsSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var OUTCOMES = [
  { field: "notifyCompleted", key: "settings.when.completed", defaultValue: true },
  { field: "notifyError", key: "settings.when.error", defaultValue: true },
  { field: "notifyAborted", key: "settings.when.aborted", defaultValue: false },
  { field: "notifyBlocked", key: "settings.when.blocked", defaultValue: false },
  { field: "notifyMaxTokens", key: "settings.when.maxTokens", defaultValue: false }
];
var PENDING = [
  { field: "notifyApproval", key: "settings.pending.approval", defaultValue: true },
  { field: "notifyQuestion", key: "settings.pending.question", defaultValue: true },
  { field: "notifyPlanReview", key: "settings.pending.planReview", defaultValue: false }
];
function notifyPatch(field, checked) {
  return { [field]: checked };
}
function Toggle(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh_notification_toggleRow", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "checkbox",
        className: "dsh_notification_checkbox",
        defaultChecked: props.defaultChecked,
        onChange: (event) => {
          props.onChange(event.target.checked);
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh_notification_toggleText", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_toggleLabel", children: props.label }),
      props.desc === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_toggleDesc", children: props.desc })
    ] })
  ] });
}
function RuleRow(props) {
  const { rule, t } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_ruleRow", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "select",
      {
        className: "dsh_notification_ruleSelect",
        value: rule.mode,
        "aria-label": t("settings.rules.mode.include"),
        onChange: (event) => {
          props.onPatch({ mode: event.target.value === "exclude" ? "exclude" : "include" });
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "include", children: t("settings.rules.mode.include") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "exclude", children: t("settings.rules.mode.exclude") })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "text",
        className: "dsh_notification_ruleInput",
        placeholder: t("settings.rules.patternPlaceholder"),
        value: rule.pattern,
        autoFocus: props.autoFocus,
        onChange: (event) => {
          props.onPatch({ pattern: event.target.value });
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh_notification_ruleCheck", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "checkbox",
          checked: rule.isRegex,
          onChange: (event) => {
            props.onPatch({ isRegex: event.target.checked });
          }
        }
      ),
      t("settings.rules.regex")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh_notification_ruleCheck", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "checkbox",
          checked: rule.caseSensitive,
          onChange: (event) => {
            props.onPatch({ caseSensitive: event.target.checked });
          }
        }
      ),
      t("settings.rules.case")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "dsh_notification_ruleDelete",
        "aria-label": t("settings.rules.remove"),
        onClick: props.onRemove,
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "currentColor", d: "M4.2 3.5h7.6l-.7 9.2a1 1 0 0 1-1 .8H5.9a1 1 0 0 1-1-.8l-.7-9.2Zm.9 1 .6 8h4.6l.6-8H5.1ZM6 1h4v1H6V1Zm-3 2h10v1H3V3Z", fillRule: "evenodd" }) })
      }
    ),
    props.errorKey === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_error", children: t(props.errorKey) })
  ] });
}
function NotificationSettingsSection({ useSettings, set, requestPermission, sendTest, t }) {
  const settings = useSettings((snapshot) => snapshot);
  const [permission, setPermission] = (0, import_react.useState)(() => notificationsApi()?.permission ?? "denied");
  const [permissionHint, setPermissionHint] = (0, import_react.useState)(null);
  const [draft, setDraft] = (0, import_react.useState)(null);
  const [focusedRuleId, setFocusedRuleId] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    const refresh = () => {
      setPermission(notificationsApi()?.permission ?? "denied");
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const durable = settings?.rules ?? [];
  const rules = draft ?? durable;
  const dirty = draft !== null;
  const error = firstRuleError(rules);
  const edit = (updater) => {
    setDraft(updater(draft ?? durable));
  };
  const addRule = () => {
    const rule = emptyRule();
    edit((list) => [...list, rule]);
    setFocusedRuleId(rule.id);
  };
  const saveRules = () => {
    if (draft === null) return;
    set({ rules: draft });
    setDraft(null);
    setFocusedRuleId(null);
  };
  const onRequestPermission = async () => {
    setPermission(await requestPermission());
    setPermissionHint(null);
  };
  const onClickTest = async () => {
    let current = notificationsApi()?.permission ?? "denied";
    if (current !== "granted") {
      current = await requestPermission();
      setPermission(current);
    }
    if (current !== "granted") {
      setPermissionHint({
        key: current === "denied" ? "settings.permission.deniedHint" : "settings.permission.defaultHint",
        error: true
      });
      return;
    }
    const result = sendTest();
    setPermissionHint(result.ok ? { key: "settings.permission.testSent", error: false } : { key: "settings.permission.testFailed", error: true, params: { message: result.message } });
  };
  const permissionText = t(`settings.permission.${permission}`);
  const badgeClass = permission === "granted" ? "dsh_notification_badgeGranted" : permission === "denied" ? "dsh_notification_badgeDenied" : "dsh_notification_badgeDefault";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh_notification_section", "aria-labelledby": "dsh-notification-settings-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { id: "dsh-notification-settings-title", className: "dsh_notification_title", children: t("settings.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_notification_subtitle", children: t("settings.subtitle") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_card", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Toggle,
      {
        defaultChecked: settings?.enabled ?? true,
        label: t("settings.enabled"),
        desc: t("settings.enabledDesc"),
        onChange: (checked) => {
          set({ enabled: checked });
        }
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardTitle", children: t("settings.pending.title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardDesc", children: t("settings.pending.subtitle") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_grid", children: PENDING.map(({ field, key, defaultValue }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Toggle,
        {
          defaultChecked: settings?.[field] ?? defaultValue,
          label: t(key),
          onChange: (checked) => {
            set(notifyPatch(field, checked));
          }
        },
        field
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardTitle", children: t("settings.permission.title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardDesc", children: t("settings.permission.desc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_permissionRow", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dsh_notification_badge ${badgeClass}`, children: permissionText }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsh_notification_button dsh_notification_buttonGhost", onClick: () => {
          void onRequestPermission();
        }, children: t("settings.permission.request") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "dsh_notification_button dsh_notification_buttonPrimary",
            onClick: () => {
              void onClickTest();
            },
            children: t("settings.permission.test")
          }
        )
      ] }),
      permissionHint === null ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          className: permissionHint.error ? "dsh_notification_error" : "dsh_notification_hint",
          "aria-live": "polite",
          children: t(permissionHint.key, permissionHint.params)
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardTitle", children: t("settings.when.title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardDesc", children: t("settings.when.subtitle") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_grid", children: OUTCOMES.map(({ field, key, defaultValue }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Toggle,
        {
          defaultChecked: settings?.[field] ?? defaultValue,
          label: t(key),
          onChange: (checked) => {
            set(notifyPatch(field, checked));
          }
        },
        field
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardTitle", children: t("settings.rules.title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardDesc", children: t("settings.rules.subtitle") })
      ] }),
      rules.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_empty", children: t("settings.rules.empty") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_rules", children: rules.map((rule, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        RuleRow,
        {
          rule,
          t,
          autoFocus: rule.id === focusedRuleId,
          errorKey: error !== void 0 && error.index === index ? error.key : void 0,
          onPatch: (patch) => {
            edit((list) => patchRule(list, rule.id, patch));
          },
          onRemove: () => {
            edit((list) => removeRule(list, rule.id));
          }
        },
        rule.id
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_rulesFooter", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsh_notification_button dsh_notification_buttonGhost", onClick: addRule, children: t("settings.rules.add") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "dsh_notification_button dsh_notification_buttonPrimary",
            disabled: !dirty || error !== void 0,
            title: !dirty || error !== void 0 ? error !== void 0 ? t(error.key) : t("settings.rules.saveHint") : void 0,
            onClick: saveRules,
            children: t("settings.rules.save")
          }
        ),
        error !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_error", children: t(error.key) }) : dirty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_notification_unsavedHint", children: t("settings.rules.unsaved") }) : null
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_notification_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_notification_cardTitle", children: t("settings.advanced.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Toggle,
        {
          defaultChecked: settings?.requireInteraction ?? false,
          label: t("settings.advanced.requireInteraction"),
          desc: t("settings.advanced.requireInteractionDesc"),
          onChange: (checked) => {
            set({ requireInteraction: checked });
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Toggle,
        {
          defaultChecked: settings?.backgroundOnly ?? true,
          label: t("settings.advanced.backgroundOnly"),
          desc: t("settings.advanced.backgroundOnlyDesc"),
          onChange: (checked) => {
            set({ backgroundOnly: checked });
          }
        }
      )
    ] })
  ] });
}

// src/client/NotificationIcon.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var ICON_REFERENCE = "plugins/dsh-notification/assets/icon.svg";
function notificationIconUrl() {
  return typeof require === "undefined" || typeof require.asset !== "function" ? ICON_REFERENCE : require.asset(ICON_REFERENCE);
}
function NotificationSectionIcon({ size, active }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "img",
    {
      className: "dsh_notification_navIcon",
      src: notificationIconUrl(),
      width: size,
      height: size,
      alt: "",
      "aria-hidden": "true",
      "data-active": active ? "true" : "false"
    }
  );
}

// src/client/locales/de.ts
var de = {
  "nav": "Benachrichtigungen",
  "settings.title": "Benachrichtigungen bei Aufgabenabschluss",
  "settings.subtitle": "Erhalte Systembenachrichtigungen oder In-App-Erinnerungen, wenn DSH einen Vorgang abschlie\xDFt oder auf eine Eingabe wartet \u2013 mit Stichwortregeln zum Filtern von Abschl\xFCssen.",
  "settings.enabled": "Benachrichtigungen aktivieren",
  "settings.enabledDesc": "Wenn dies ausgeschaltet ist, werden keine Benachrichtigungen mehr angezeigt; Regeln und Einstellungen bleiben erhalten.",
  "settings.permission.title": "Browserberechtigung",
  "settings.permission.desc": "Systembenachrichtigungen ben\xF6tigen eine Browserberechtigung; In-App-Erinnerungen nicht. Erteile sie unten und sende dann eine System-Testbenachrichtigung.",
  "settings.permission.granted": "Erteilt",
  "settings.permission.denied": "Verweigert (in den Website-Einstellungen des Browsers wieder aktivieren)",
  "settings.permission.default": "Nicht erteilt",
  "settings.permission.defaultHint": "Die Berechtigung f\xFCr Systembenachrichtigungen ist noch nicht erteilt: Klicke auf \u201EBerechtigung anfordern\u201C und best\xE4tige die Browserabfrage. In-App-Erinnerungen sind davon nicht betroffen.",
  "settings.permission.deniedHint": "Die Berechtigung f\xFCr Systembenachrichtigungen wurde verweigert: Aktiviere sie in den Website-Einstellungen des Browsers erneut. In-App-Erinnerungen sind davon nicht betroffen.",
  "settings.permission.request": "Berechtigung anfordern",
  "settings.permission.test": "Testbenachrichtigung senden",
  "settings.permission.testSent": "Die Testbenachrichtigung wurde angefordert. Wenn sie nicht sichtbar ist, pr\xFCfe die Website-Berechtigung, die Systembenachrichtigungseinstellungen sowie den Fokus- oder Nicht-st\xF6ren-Modus.",
  "settings.permission.testFailed": "Der Browser konnte die Testbenachrichtigung nicht erstellen: {message}",
  "settings.when.title": "Wann benachrichtigen",
  "settings.when.subtitle": "W\xE4hle die Endzust\xE4nde, die eine Benachrichtigung ausl\xF6sen.",
  "settings.when.completed": "Abgeschlossen",
  "settings.when.error": "Fehlgeschlagen",
  "settings.when.aborted": "Abgebrochen",
  "settings.when.blocked": "Blockiert",
  "settings.when.maxTokens": "Token-Limit erreicht",
  "settings.pending.title": "Warten auf Best\xE4tigung",
  "settings.pending.subtitle": "Erhalte einen Hinweis, wenn DSH auf deine Freigabe, Antwort oder Planpr\xFCfung wartet.",
  "settings.pending.approval": "Warten auf Freigabe",
  "settings.pending.question": "Warten auf eine Antwort",
  "settings.pending.planReview": "Warten auf Planpr\xFCfung",
  "settings.rules.title": "Stichwortregeln",
  "settings.rules.subtitle": "Regeln pr\xFCfen den Antworttext des Durchlaufs und die Namen aufgerufener Werkzeuge. Einschlussregeln: nur benachrichtigen, wenn eine passt. Ausschlussregeln: bei \xDCbereinstimmung unterdr\xFCcken.",
  "settings.rules.empty": "Noch keine Regeln \u2013 jeder aktivierte Endzustand benachrichtigt.",
  "settings.rules.add": "Regel hinzuf\xFCgen",
  "settings.rules.save": "Regeln speichern",
  "settings.rules.mode.include": "Einschlie\xDFen",
  "settings.rules.mode.exclude": "Ausschlie\xDFen",
  "settings.rules.patternPlaceholder": "Stichwort oder regul\xE4rer Ausdruck",
  "settings.rules.regex": "Regex",
  "settings.rules.case": "Gro\xDF-/Kleinschreibung beachten",
  "settings.rules.remove": "Regel entfernen",
  "settings.rules.invalid": "Das Muster der Regel darf nicht leer sein",
  "settings.rules.invalidRegex": "Ung\xFCltiger regul\xE4rer Ausdruck",
  "settings.rules.unsaved": "Regeln haben ungespeicherte \xC4nderungen",
  "settings.rules.saveHint": "Zuerst das Muster der Regel eingeben, dann speichern",
  "settings.advanced.title": "Erweitert",
  "settings.advanced.requireInteraction": "Manuelles Schlie\xDFen erforderlich",
  "settings.advanced.requireInteractionDesc": "Deaktiviert das automatische Ausblenden von In-App-Hinweisen; \xD6ffnen oder Schlie\xDFen entfernt sie. Es werden nur f\xFCnf behalten, ein weiterer Hinweis verdr\xE4ngt den \xE4ltesten. Fordert dauerhafte Systembenachrichtigungen an (je nach Browser und Betriebssystem unterschiedlich).",
  "settings.advanced.backgroundOnly": "Systembenachrichtigungen im Hintergrund, In-App-Hinweise im Vordergrund",
  "settings.advanced.backgroundOnlyDesc": "Wenn aktiviert, teilen sich Abschluss- und Warte-Erinnerungen diese Regel: Ausgeblendete oder nicht fokussierte Fenster verwenden Systembenachrichtigungen f\xFCr alle Sitzungen (Berechtigung erforderlich). Sichtbare, fokussierte Fenster zeigen klickbare, schlie\xDFbare In-App-Hinweise nur f\xFCr Unterhaltungen au\xDFerhalb der Hauptansicht, ohne Systemberechtigung; die Unterhaltung der Hauptansicht wird unterdr\xFCckt. Deaktiviere dies, um Systembenachrichtigungen im Vorder- und Hintergrund zu verwenden, einschlie\xDFlich der aktuellen Unterhaltung. Tests verwenden immer Systembenachrichtigungen und umgehen diese Einstellung. Erinnerungen enden, wenn die App beendet oder der Renderer zerst\xF6rt wird.",
  "notify.titleCompleted": "DSH ist fertig",
  "notify.titleError": "DSH ist fehlgeschlagen",
  "notify.titleAborted": "DSH wurde abgebrochen",
  "notify.titleBlocked": "DSH ben\xF6tigt Aufmerksamkeit",
  "notify.titleMaxTokens": "DSH hat das Token-Limit erreicht",
  "notify.titleApproval": "DSH ben\xF6tigt deine Freigabe",
  "notify.titleQuestion": "DSH ben\xF6tigt deine Antwort",
  "notify.titlePlanReview": "DSH ben\xF6tigt deine Planpr\xFCfung",
  "notify.pendingBody": "Es gibt eine ausstehende Aktion",
  "notify.emptyBody": "Die Aufgabe ist erledigt",
  "notify.open": "Unterhaltung \xF6ffnen",
  "notify.dismiss": "Benachrichtigung schlie\xDFen",
  "notify.inAppLabel": "Unterhaltungsbenachrichtigungen",
  "notify.testTitle": "DSH-Benachrichtigungstest",
  "notify.testBody": "Wenn du diese Benachrichtigung siehst, sind die Benachrichtigungen korrekt eingerichtet."
};

// src/client/locales/en.ts
var en = {
  "nav": "Notifications",
  "settings.title": "Task completion notifications",
  "settings.subtitle": "Get system notifications or in-app reminders when DSH finishes an operation or waits for input, with keyword rules to filter completions.",
  "settings.enabled": "Enable notifications",
  "settings.enabledDesc": "Turning this off stops every notification; rules and preferences are kept.",
  "settings.permission.title": "Browser permission",
  "settings.permission.desc": "System notifications need browser permission; in-app reminders do not. Grant it below, then send a system test notification.",
  "settings.permission.granted": "Granted",
  "settings.permission.denied": "Denied (re-enable in the browser's site settings)",
  "settings.permission.default": "Not granted",
  "settings.permission.defaultHint": "System notification permission is not granted yet: click Request permission and allow it in the browser prompt. In-app reminders are unaffected.",
  "settings.permission.deniedHint": "System notification permission was denied: re-enable it in the browser's site settings. In-app reminders are unaffected.",
  "settings.permission.request": "Request permission",
  "settings.permission.test": "Send test notification",
  "settings.permission.testSent": "The test notification was requested. If it is not visible, check the browser site permission, system notification settings, and Focus or Do Not Disturb mode.",
  "settings.permission.testFailed": "The browser could not create the test notification: {message}",
  "settings.when.title": "When to notify",
  "settings.when.subtitle": "Choose which end states trigger a notification.",
  "settings.when.completed": "Completed",
  "settings.when.error": "Failed",
  "settings.when.aborted": "Aborted",
  "settings.when.blocked": "Blocked",
  "settings.when.maxTokens": "Hit token limit",
  "settings.pending.title": "Awaiting confirmation",
  "settings.pending.subtitle": "Get notified when DSH waits for your approval, answer, or plan review.",
  "settings.pending.approval": "Awaiting approval",
  "settings.pending.question": "Awaiting an answer",
  "settings.pending.planReview": "Awaiting plan review",
  "settings.rules.title": "Keyword rules",
  "settings.rules.subtitle": "Rules match the turn's reply text and called tool names. Include rules: notify only if one matches. Exclude rules: suppress on match.",
  "settings.rules.empty": "No rules yet \u2014 every enabled end state notifies.",
  "settings.rules.add": "Add rule",
  "settings.rules.save": "Save rules",
  "settings.rules.mode.include": "Include",
  "settings.rules.mode.exclude": "Exclude",
  "settings.rules.patternPlaceholder": "Keyword or regular expression",
  "settings.rules.regex": "Regex",
  "settings.rules.case": "Case sensitive",
  "settings.rules.remove": "Remove rule",
  "settings.rules.invalid": "Rule pattern must not be empty",
  "settings.rules.invalidRegex": "Invalid regular expression",
  "settings.rules.unsaved": "Rules have unsaved changes",
  "settings.rules.saveHint": "Fill in the rule pattern first, then save",
  "settings.advanced.title": "Advanced",
  "settings.advanced.requireInteraction": "Require manual dismiss",
  "settings.advanced.requireInteractionDesc": "Disable automatic expiry for in-app toasts; open or dismiss to remove them. Only five are kept, so an additional toast evicts the oldest. Request persistent system notifications (browser/OS support varies).",
  "settings.advanced.backgroundOnly": "System notifications in background, in-app toasts in foreground",
  "settings.advanced.backgroundOnlyDesc": "When on, completion and pending reminders share this rule: hidden or unfocused windows use system notifications for any session (permission required). Visible, focused windows show clickable, dismissible in-app toasts only for conversations outside the main view, without OS notification permission; the main-view conversation is suppressed. Turn this off to use system notifications in foreground and background, including the current conversation. Tests always use system notifications and bypass this setting. Reminders stop if the app exits or the renderer is destroyed.",
  "notify.titleCompleted": "DSH finished",
  "notify.titleError": "DSH failed",
  "notify.titleAborted": "DSH aborted",
  "notify.titleBlocked": "DSH needs attention",
  "notify.titleMaxTokens": "DSH hit the token limit",
  "notify.titleApproval": "DSH needs your approval",
  "notify.titleQuestion": "DSH needs your answer",
  "notify.titlePlanReview": "DSH needs your plan review",
  "notify.pendingBody": "There is a pending action",
  "notify.emptyBody": "The task is done",
  "notify.open": "Open conversation",
  "notify.dismiss": "Dismiss notification",
  "notify.inAppLabel": "Conversation notifications",
  "notify.testTitle": "DSH notification test",
  "notify.testBody": "If you can see this notification, notifications are configured correctly."
};

// src/client/locales/es.ts
var es = {
  "nav": "Notificaciones",
  "settings.title": "Notificaciones de finalizaci\xF3n de tareas",
  "settings.subtitle": "Recibe notificaciones del sistema o recordatorios en la aplicaci\xF3n cuando DSH termina una operaci\xF3n o espera tu entrada, con reglas de palabras clave para filtrar finalizaciones.",
  "settings.enabled": "Activar notificaciones",
  "settings.enabledDesc": "Al desactivarlo se detienen todas las notificaciones; las reglas y preferencias se conservan.",
  "settings.permission.title": "Permiso del navegador",
  "settings.permission.desc": "Las notificaciones del sistema requieren permiso del navegador; los recordatorios en la aplicaci\xF3n no. Conc\xE9delo abajo y luego env\xEDa una notificaci\xF3n de prueba del sistema.",
  "settings.permission.granted": "Concedido",
  "settings.permission.denied": "Denegado (vuelve a activarlo en la configuraci\xF3n del sitio del navegador)",
  "settings.permission.default": "No concedido",
  "settings.permission.defaultHint": "El permiso de notificaciones del sistema a\xFAn no est\xE1 concedido: haz clic en Solicitar permiso y ac\xE9ptalo en el aviso del navegador. Los recordatorios en la aplicaci\xF3n no se ven afectados.",
  "settings.permission.deniedHint": "El permiso de notificaciones del sistema fue denegado: vuelve a activarlo en la configuraci\xF3n del sitio del navegador. Los recordatorios en la aplicaci\xF3n no se ven afectados.",
  "settings.permission.request": "Solicitar permiso",
  "settings.permission.test": "Enviar notificaci\xF3n de prueba",
  "settings.permission.testSent": "Se solicit\xF3 la notificaci\xF3n de prueba. Si no la ves, revisa el permiso del sitio en el navegador, la configuraci\xF3n de notificaciones del sistema y el modo Concentraci\xF3n o No molestar.",
  "settings.permission.testFailed": "El navegador no pudo crear la notificaci\xF3n de prueba: {message}",
  "settings.when.title": "Cu\xE1ndo notificar",
  "settings.when.subtitle": "Elige qu\xE9 estados finales activan una notificaci\xF3n.",
  "settings.when.completed": "Completado",
  "settings.when.error": "Fallido",
  "settings.when.aborted": "Cancelado",
  "settings.when.blocked": "Bloqueado",
  "settings.when.maxTokens": "L\xEDmite de tokens alcanzado",
  "settings.pending.title": "Esperando confirmaci\xF3n",
  "settings.pending.subtitle": "Recibe un aviso cuando DSH espere tu aprobaci\xF3n, respuesta o revisi\xF3n de plan.",
  "settings.pending.approval": "Esperando aprobaci\xF3n",
  "settings.pending.question": "Esperando una respuesta",
  "settings.pending.planReview": "Esperando revisi\xF3n del plan",
  "settings.rules.title": "Reglas de palabras clave",
  "settings.rules.subtitle": "Las reglas coinciden con el texto de respuesta del turno y los nombres de las herramientas llamadas. Reglas de inclusi\xF3n: notificar solo si alguna coincide. Reglas de exclusi\xF3n: suprimir si coinciden.",
  "settings.rules.empty": "A\xFAn no hay reglas: se notifica cada estado final activado.",
  "settings.rules.add": "A\xF1adir regla",
  "settings.rules.save": "Guardar reglas",
  "settings.rules.mode.include": "Incluir",
  "settings.rules.mode.exclude": "Excluir",
  "settings.rules.patternPlaceholder": "Palabra clave o expresi\xF3n regular",
  "settings.rules.regex": "Regex",
  "settings.rules.case": "Distinguir may\xFAsculas",
  "settings.rules.remove": "Eliminar regla",
  "settings.rules.invalid": "El patr\xF3n de la regla no puede estar vac\xEDo",
  "settings.rules.invalidRegex": "Expresi\xF3n regular no v\xE1lida",
  "settings.rules.unsaved": "Las reglas tienen cambios sin guardar",
  "settings.rules.saveHint": "Escribe primero el patr\xF3n de la regla y luego guarda",
  "settings.advanced.title": "Avanzado",
  "settings.advanced.requireInteraction": "Requerir cierre manual",
  "settings.advanced.requireInteractionDesc": "Desactiva la caducidad autom\xE1tica de los avisos en la aplicaci\xF3n; se quitan al abrirlos o cerrarlos. Solo se conservan cinco, as\xED que un aviso adicional elimina el m\xE1s antiguo. Solicita notificaciones del sistema persistentes (la compatibilidad var\xEDa seg\xFAn el navegador y el sistema operativo).",
  "settings.advanced.backgroundOnly": "Notificaciones del sistema en segundo plano, avisos en la aplicaci\xF3n en primer plano",
  "settings.advanced.backgroundOnlyDesc": "Cuando est\xE1 activado, los recordatorios de finalizaci\xF3n y de espera comparten esta regla: las ventanas ocultas o sin foco usan notificaciones del sistema para cualquier sesi\xF3n (requiere permiso). Las ventanas visibles y enfocadas muestran avisos en la aplicaci\xF3n, con clic y cierre, solo para conversaciones fuera de la vista principal, sin necesidad de permiso de notificaciones del sistema; la conversaci\xF3n de la vista principal se suprime. Desact\xEDvalo para usar notificaciones del sistema en primer y segundo plano, incluida la conversaci\xF3n actual. Las pruebas siempre usan notificaciones del sistema y omiten esta opci\xF3n. Los recordatorios se detienen si la aplicaci\xF3n se cierra o el renderizador se destruye.",
  "notify.titleCompleted": "DSH ha terminado",
  "notify.titleError": "DSH ha fallado",
  "notify.titleAborted": "DSH se ha cancelado",
  "notify.titleBlocked": "DSH requiere atenci\xF3n",
  "notify.titleMaxTokens": "DSH alcanz\xF3 el l\xEDmite de tokens",
  "notify.titleApproval": "DSH necesita tu aprobaci\xF3n",
  "notify.titleQuestion": "DSH necesita tu respuesta",
  "notify.titlePlanReview": "DSH necesita tu revisi\xF3n del plan",
  "notify.pendingBody": "Hay una acci\xF3n pendiente",
  "notify.emptyBody": "La tarea est\xE1 hecha",
  "notify.open": "Abrir conversaci\xF3n",
  "notify.dismiss": "Cerrar notificaci\xF3n",
  "notify.inAppLabel": "Notificaciones de conversaci\xF3n",
  "notify.testTitle": "Prueba de notificaciones de DSH",
  "notify.testBody": "Si ves esta notificaci\xF3n, las notificaciones est\xE1n configuradas correctamente."
};

// src/client/locales/fr.ts
var fr = {
  "nav": "Notifications",
  "settings.title": "Notifications de fin de t\xE2che",
  "settings.subtitle": "Recevez des notifications syst\xE8me ou des rappels dans l'application lorsque DSH termine une op\xE9ration ou attend une saisie, avec des r\xE8gles par mots-cl\xE9s pour filtrer les fins de t\xE2che.",
  "settings.enabled": "Activer les notifications",
  "settings.enabledDesc": "La d\xE9sactivation arr\xEAte toutes les notifications ; les r\xE8gles et pr\xE9f\xE9rences sont conserv\xE9es.",
  "settings.permission.title": "Autorisation du navigateur",
  "settings.permission.desc": "Les notifications syst\xE8me n\xE9cessitent l'autorisation du navigateur ; les rappels dans l'application non. Accordez-la ci-dessous, puis envoyez une notification syst\xE8me de test.",
  "settings.permission.granted": "Accord\xE9e",
  "settings.permission.denied": "Refus\xE9e (r\xE9activez-la dans les param\xE8tres du site du navigateur)",
  "settings.permission.default": "Non accord\xE9e",
  "settings.permission.defaultHint": "L'autorisation des notifications syst\xE8me n'est pas encore accord\xE9e : cliquez sur Demander l'autorisation et acceptez dans l'invite du navigateur. Les rappels dans l'application ne sont pas concern\xE9s.",
  "settings.permission.deniedHint": "L'autorisation des notifications syst\xE8me a \xE9t\xE9 refus\xE9e : r\xE9activez-la dans les param\xE8tres du site du navigateur. Les rappels dans l'application ne sont pas concern\xE9s.",
  "settings.permission.request": "Demander l'autorisation",
  "settings.permission.test": "Envoyer une notification de test",
  "settings.permission.testSent": "La notification de test a \xE9t\xE9 demand\xE9e. Si elle n'appara\xEEt pas, v\xE9rifiez l'autorisation du site, les param\xE8tres de notification du syst\xE8me et le mode Concentration ou Ne pas d\xE9ranger.",
  "settings.permission.testFailed": "Le navigateur n'a pas pu cr\xE9er la notification de test : {message}",
  "settings.when.title": "Quand notifier",
  "settings.when.subtitle": "Choisissez les \xE9tats de fin qui d\xE9clenchent une notification.",
  "settings.when.completed": "Termin\xE9",
  "settings.when.error": "\xC9chec",
  "settings.when.aborted": "Interrompu",
  "settings.when.blocked": "Bloqu\xE9",
  "settings.when.maxTokens": "Limite de tokens atteinte",
  "settings.pending.title": "En attente de confirmation",
  "settings.pending.subtitle": "Soyez averti lorsque DSH attend votre approbation, votre r\xE9ponse ou la relecture d'un plan.",
  "settings.pending.approval": "En attente d'approbation",
  "settings.pending.question": "En attente d'une r\xE9ponse",
  "settings.pending.planReview": "En attente de relecture du plan",
  "settings.rules.title": "R\xE8gles par mots-cl\xE9s",
  "settings.rules.subtitle": "Les r\xE8gles portent sur le texte de r\xE9ponse du tour et les noms des outils appel\xE9s. R\xE8gles d'inclusion : notifier seulement si l'une correspond. R\xE8gles d'exclusion : supprimer la notification en cas de correspondance.",
  "settings.rules.empty": "Aucune r\xE8gle pour l'instant \u2014 chaque \xE9tat de fin activ\xE9 notifie.",
  "settings.rules.add": "Ajouter une r\xE8gle",
  "settings.rules.save": "Enregistrer les r\xE8gles",
  "settings.rules.mode.include": "Inclure",
  "settings.rules.mode.exclude": "Exclure",
  "settings.rules.patternPlaceholder": "Mot-cl\xE9 ou expression r\xE9guli\xE8re",
  "settings.rules.regex": "Regex",
  "settings.rules.case": "Sensible \xE0 la casse",
  "settings.rules.remove": "Supprimer la r\xE8gle",
  "settings.rules.invalid": "Le motif de la r\xE8gle ne doit pas \xEAtre vide",
  "settings.rules.invalidRegex": "Expression r\xE9guli\xE8re non valide",
  "settings.rules.unsaved": "Les r\xE8gles ont des modifications non enregistr\xE9es",
  "settings.rules.saveHint": "Renseignez d'abord le motif de la r\xE8gle, puis enregistrez",
  "settings.advanced.title": "Avanc\xE9",
  "settings.advanced.requireInteraction": "Exiger une fermeture manuelle",
  "settings.advanced.requireInteractionDesc": "D\xE9sactive l'expiration automatique des rappels dans l'application ; ouvrez-les ou fermez-les pour les retirer. Cinq au maximum sont conserv\xE9s : un rappel suppl\xE9mentaire \xE9vince le plus ancien. Demande des notifications syst\xE8me persistantes (la prise en charge varie selon le navigateur et le syst\xE8me).",
  "settings.advanced.backgroundOnly": "Notifications syst\xE8me en arri\xE8re-plan, rappels dans l'application au premier plan",
  "settings.advanced.backgroundOnlyDesc": "Lorsque cette option est activ\xE9e, les rappels de fin et d'attente partagent cette r\xE8gle : les fen\xEAtres masqu\xE9es ou sans focus utilisent les notifications syst\xE8me pour toutes les sessions (autorisation requise). Les fen\xEAtres visibles et cibl\xE9es affichent des rappels cliquables et fermables dans l'application uniquement pour les conversations hors de la vue principale, sans autorisation de notification syst\xE8me ; la conversation de la vue principale est ignor\xE9e. D\xE9sactivez cette option pour utiliser les notifications syst\xE8me au premier plan et en arri\xE8re-plan, y compris pour la conversation en cours. Les tests utilisent toujours les notifications syst\xE8me et ignorent ce r\xE9glage. Les rappels s'arr\xEAtent si l'application quitte ou si le moteur de rendu est d\xE9truit.",
  "notify.titleCompleted": "DSH a termin\xE9",
  "notify.titleError": "DSH a \xE9chou\xE9",
  "notify.titleAborted": "DSH a \xE9t\xE9 interrompu",
  "notify.titleBlocked": "DSH n\xE9cessite votre attention",
  "notify.titleMaxTokens": "DSH a atteint la limite de tokens",
  "notify.titleApproval": "DSH a besoin de votre approbation",
  "notify.titleQuestion": "DSH a besoin de votre r\xE9ponse",
  "notify.titlePlanReview": "DSH a besoin de votre relecture du plan",
  "notify.pendingBody": "Une action est en attente",
  "notify.emptyBody": "La t\xE2che est termin\xE9e",
  "notify.open": "Ouvrir la conversation",
  "notify.dismiss": "Fermer la notification",
  "notify.inAppLabel": "Notifications de conversation",
  "notify.testTitle": "Test de notification DSH",
  "notify.testBody": "Si vous voyez cette notification, les notifications sont correctement configur\xE9es."
};

// src/client/locales/ja.ts
var ja = {
  "nav": "\u901A\u77E5",
  "settings.title": "\u30BF\u30B9\u30AF\u5B8C\u4E86\u306E\u901A\u77E5",
  "settings.subtitle": "DSH \u304C\u64CD\u4F5C\u3092\u5B8C\u4E86\u3057\u305F\u3068\u304D\u3001\u307E\u305F\u306F\u5165\u529B\u3092\u5F85\u3063\u3066\u3044\u308B\u3068\u304D\u306B\u3001\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u307E\u305F\u306F\u30A2\u30D7\u30EA\u5185\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u3067\u77E5\u3089\u305B\u307E\u3059\u3002\u30AD\u30FC\u30EF\u30FC\u30C9\u30EB\u30FC\u30EB\u3067\u901A\u77E5\u3059\u308B\u5B8C\u4E86\u3092\u7D5E\u308A\u8FBC\u3081\u307E\u3059\u3002",
  "settings.enabled": "\u901A\u77E5\u3092\u6709\u52B9\u306B\u3059\u308B",
  "settings.enabledDesc": "\u30AA\u30D5\u306B\u3059\u308B\u3068\u901A\u77E5\u306F\u4E00\u5207\u8868\u793A\u3055\u308C\u307E\u305B\u3093\u3002\u30EB\u30FC\u30EB\u3068\u8A2D\u5B9A\u306F\u4FDD\u6301\u3055\u308C\u307E\u3059\u3002",
  "settings.permission.title": "\u30D6\u30E9\u30A6\u30B6\u306E\u6A29\u9650",
  "settings.permission.desc": "\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u306B\u306F\u30D6\u30E9\u30A6\u30B6\u306E\u8A31\u53EF\u304C\u5FC5\u8981\u3067\u3059\u3002\u30A2\u30D7\u30EA\u5185\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u306B\u306F\u4E0D\u8981\u3067\u3059\u3002\u4E0B\u3067\u8A31\u53EF\u3057\u3066\u304B\u3089\u3001\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u306E\u30C6\u30B9\u30C8\u3092\u9001\u4FE1\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "settings.permission.granted": "\u8A31\u53EF\u6E08\u307F",
  "settings.permission.denied": "\u62D2\u5426\u3055\u308C\u307E\u3057\u305F\uFF08\u30D6\u30E9\u30A6\u30B6\u306E\u30B5\u30A4\u30C8\u8A2D\u5B9A\u3067\u518D\u5EA6\u6709\u52B9\u306B\u3057\u3066\u304F\u3060\u3055\u3044\uFF09",
  "settings.permission.default": "\u672A\u8A31\u53EF",
  "settings.permission.defaultHint": "\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u306E\u6A29\u9650\u304C\u307E\u3060\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u300C\u6A29\u9650\u3092\u30EA\u30AF\u30A8\u30B9\u30C8\u300D\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3001\u30D6\u30E9\u30A6\u30B6\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u3067\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30A2\u30D7\u30EA\u5185\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u306F\u5F71\u97FF\u3092\u53D7\u3051\u307E\u305B\u3093\u3002",
  "settings.permission.deniedHint": "\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u306E\u6A29\u9650\u304C\u62D2\u5426\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u30D6\u30E9\u30A6\u30B6\u306E\u30B5\u30A4\u30C8\u8A2D\u5B9A\u3067\u518D\u5EA6\u6709\u52B9\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30A2\u30D7\u30EA\u5185\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u306F\u5F71\u97FF\u3092\u53D7\u3051\u307E\u305B\u3093\u3002",
  "settings.permission.request": "\u6A29\u9650\u3092\u30EA\u30AF\u30A8\u30B9\u30C8",
  "settings.permission.test": "\u30C6\u30B9\u30C8\u901A\u77E5\u3092\u9001\u4FE1",
  "settings.permission.testSent": "\u30C6\u30B9\u30C8\u901A\u77E5\u3092\u30EA\u30AF\u30A8\u30B9\u30C8\u3057\u307E\u3057\u305F\u3002\u8868\u793A\u3055\u308C\u306A\u3044\u5834\u5408\u306F\u3001\u30D6\u30E9\u30A6\u30B6\u306E\u30B5\u30A4\u30C8\u6A29\u9650\u3001\u30B7\u30B9\u30C6\u30E0\u306E\u901A\u77E5\u8A2D\u5B9A\u3001\u96C6\u4E2D\u30E2\u30FC\u30C9\u3084\u304A\u3084\u3059\u307F\u30E2\u30FC\u30C9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "settings.permission.testFailed": "\u30D6\u30E9\u30A6\u30B6\u304C\u30C6\u30B9\u30C8\u901A\u77E5\u3092\u4F5C\u6210\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F: {message}",
  "settings.when.title": "\u901A\u77E5\u3059\u308B\u30BF\u30A4\u30DF\u30F3\u30B0",
  "settings.when.subtitle": "\u901A\u77E5\u3092\u767A\u751F\u3055\u305B\u308B\u7D42\u4E86\u72B6\u614B\u3092\u9078\u629E\u3057\u307E\u3059\u3002",
  "settings.when.completed": "\u6B63\u5E38\u306B\u5B8C\u4E86",
  "settings.when.error": "\u30A8\u30E9\u30FC",
  "settings.when.aborted": "\u4E2D\u6B62",
  "settings.when.blocked": "\u30D6\u30ED\u30C3\u30AF",
  "settings.when.maxTokens": "\u30C8\u30FC\u30AF\u30F3\u4E0A\u9650\u306B\u5230\u9054",
  "settings.pending.title": "\u78BA\u8A8D\u5F85\u3061",
  "settings.pending.subtitle": "DSH \u304C\u627F\u8A8D\u3001\u56DE\u7B54\u3001\u307E\u305F\u306F\u8A08\u753B\u306E\u30EC\u30D3\u30E5\u30FC\u3092\u5F85\u3063\u3066\u3044\u308B\u3068\u304D\u306B\u901A\u77E5\u3057\u307E\u3059\u3002",
  "settings.pending.approval": "\u627F\u8A8D\u5F85\u3061",
  "settings.pending.question": "\u56DE\u7B54\u5F85\u3061",
  "settings.pending.planReview": "\u8A08\u753B\u30EC\u30D3\u30E5\u30FC\u5F85\u3061",
  "settings.rules.title": "\u30AD\u30FC\u30EF\u30FC\u30C9\u30EB\u30FC\u30EB",
  "settings.rules.subtitle": "\u30EB\u30FC\u30EB\u306F\u305D\u306E\u30BF\u30FC\u30F3\u306E\u8FD4\u4FE1\u30C6\u30AD\u30B9\u30C8\u3068\u547C\u3073\u51FA\u3055\u308C\u305F\u30C4\u30FC\u30EB\u540D\u306B\u4E00\u81F4\u3057\u307E\u3059\u3002\u5305\u542B\u30EB\u30FC\u30EB: \u3044\u305A\u308C\u304B\u306B\u4E00\u81F4\u3057\u305F\u5834\u5408\u306E\u307F\u901A\u77E5\u3057\u307E\u3059\u3002\u9664\u5916\u30EB\u30FC\u30EB: \u4E00\u81F4\u3057\u305F\u5834\u5408\u306F\u901A\u77E5\u3057\u307E\u305B\u3093\u3002",
  "settings.rules.empty": "\u30EB\u30FC\u30EB\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002\u6709\u52B9\u306A\u7D42\u4E86\u72B6\u614B\u306F\u3059\u3079\u3066\u901A\u77E5\u3055\u308C\u307E\u3059\u3002",
  "settings.rules.add": "\u30EB\u30FC\u30EB\u3092\u8FFD\u52A0",
  "settings.rules.save": "\u30EB\u30FC\u30EB\u3092\u4FDD\u5B58",
  "settings.rules.mode.include": "\u542B\u3081\u308B",
  "settings.rules.mode.exclude": "\u9664\u5916\u3059\u308B",
  "settings.rules.patternPlaceholder": "\u30AD\u30FC\u30EF\u30FC\u30C9\u307E\u305F\u306F\u6B63\u898F\u8868\u73FE",
  "settings.rules.regex": "\u6B63\u898F\u8868\u73FE",
  "settings.rules.case": "\u5927\u6587\u5B57\u3068\u5C0F\u6587\u5B57\u3092\u533A\u5225",
  "settings.rules.remove": "\u30EB\u30FC\u30EB\u3092\u524A\u9664",
  "settings.rules.invalid": "\u30EB\u30FC\u30EB\u306E\u30D1\u30BF\u30FC\u30F3\u306F\u7A7A\u306B\u3067\u304D\u307E\u305B\u3093",
  "settings.rules.invalidRegex": "\u7121\u52B9\u306A\u6B63\u898F\u8868\u73FE\u3067\u3059",
  "settings.rules.unsaved": "\u4FDD\u5B58\u3055\u308C\u3066\u3044\u306A\u3044\u5909\u66F4\u304C\u3042\u308A\u307E\u3059",
  "settings.rules.saveHint": "\u5148\u306B\u30EB\u30FC\u30EB\u306E\u30D1\u30BF\u30FC\u30F3\u3092\u5165\u529B\u3057\u3066\u304B\u3089\u4FDD\u5B58\u3057\u3066\u304F\u3060\u3055\u3044",
  "settings.advanced.title": "\u8A73\u7D30",
  "settings.advanced.requireInteraction": "\u624B\u52D5\u3067\u9589\u3058\u308B",
  "settings.advanced.requireInteractionDesc": "\u30A2\u30D7\u30EA\u5185\u30C8\u30FC\u30B9\u30C8\u306E\u81EA\u52D5\u6D88\u53BB\u3092\u7121\u52B9\u306B\u3057\u307E\u3059\u3002\u958B\u304F\u304B\u9589\u3058\u308B\u307E\u3067\u6B8B\u308A\u307E\u3059\u3002\u4FDD\u6301\u3067\u304D\u308B\u306E\u306F 5 \u4EF6\u307E\u3067\u3067\u3001\u8FFD\u52A0\u3059\u308B\u3068\u6700\u3082\u53E4\u3044\u3082\u306E\u304C\u6D88\u3048\u307E\u3059\u3002\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u306E\u7D99\u7D9A\u8868\u793A\u3092\u8981\u6C42\u3057\u307E\u3059\uFF08\u30D6\u30E9\u30A6\u30B6\u3068 OS \u306E\u5BFE\u5FDC\u306B\u3088\u308A\u307E\u3059\uFF09\u3002",
  "settings.advanced.backgroundOnly": "\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u3067\u306F\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u3001\u30D5\u30A9\u30A2\u30B0\u30E9\u30A6\u30F3\u30C9\u3067\u306F\u30A2\u30D7\u30EA\u5185\u30C8\u30FC\u30B9\u30C8",
  "settings.advanced.backgroundOnlyDesc": "\u30AA\u30F3\u306E\u5834\u5408\u3001\u5B8C\u4E86\u3068\u78BA\u8A8D\u5F85\u3061\u306E\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u306F\u3053\u306E\u30EB\u30FC\u30EB\u3092\u5171\u6709\u3057\u307E\u3059\u3002\u975E\u8868\u793A\u307E\u305F\u306F\u30D5\u30A9\u30FC\u30AB\u30B9\u304C\u306A\u3044\u30A6\u30A3\u30F3\u30C9\u30A6\u3067\u306F\u3001\u3059\u3079\u3066\u306E\u30BB\u30C3\u30B7\u30E7\u30F3\u3067\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u3092\u4F7F\u7528\u3057\u307E\u3059\uFF08\u8A31\u53EF\u304C\u5FC5\u8981\uFF09\u3002\u8868\u793A\u3055\u308C\u30D5\u30A9\u30FC\u30AB\u30B9\u304C\u3042\u308B\u30A6\u30A3\u30F3\u30C9\u30A6\u3067\u306F\u3001\u30E1\u30A4\u30F3\u30D3\u30E5\u30FC\u4EE5\u5916\u306E\u4F1A\u8A71\u306B\u306E\u307F\u30AF\u30EA\u30C3\u30AF\u53EF\u80FD\u3067\u9589\u3058\u3089\u308C\u308B\u30A2\u30D7\u30EA\u5185\u30C8\u30FC\u30B9\u30C8\u3092\u8868\u793A\u3057\u3001OS \u306E\u901A\u77E5\u8A31\u53EF\u306F\u4E0D\u8981\u3067\u3059\u3002\u30E1\u30A4\u30F3\u30D3\u30E5\u30FC\u306E\u4F1A\u8A71\u306F\u901A\u77E5\u3057\u307E\u305B\u3093\u3002\u30AA\u30D5\u306B\u3059\u308B\u3068\u3001\u73FE\u5728\u306E\u4F1A\u8A71\u3092\u542B\u3081\u3001\u30D5\u30A9\u30A2\u30B0\u30E9\u30A6\u30F3\u30C9\u3068\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u306E\u3059\u3079\u3066\u3067\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\u30C6\u30B9\u30C8\u306F\u5E38\u306B\u30B7\u30B9\u30C6\u30E0\u901A\u77E5\u3092\u4F7F\u7528\u3057\u3001\u3053\u306E\u8A2D\u5B9A\u3092\u7121\u8996\u3057\u307E\u3059\u3002\u30A2\u30D7\u30EA\u3092\u7D42\u4E86\u3059\u308B\u304B\u30EC\u30F3\u30C0\u30E9\u30FC\u304C\u7834\u68C4\u3055\u308C\u308B\u3068\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u306F\u505C\u6B62\u3057\u307E\u3059\u3002",
  "notify.titleCompleted": "DSH \u304C\u30BF\u30B9\u30AF\u3092\u5B8C\u4E86\u3057\u307E\u3057\u305F",
  "notify.titleError": "DSH \u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
  "notify.titleAborted": "DSH \u304C\u4E2D\u6B62\u3055\u308C\u307E\u3057\u305F",
  "notify.titleBlocked": "DSH \u304C\u5BFE\u5FDC\u3092\u5FC5\u8981\u3068\u3057\u3066\u3044\u307E\u3059",
  "notify.titleMaxTokens": "DSH \u304C\u30C8\u30FC\u30AF\u30F3\u4E0A\u9650\u306B\u9054\u3057\u307E\u3057\u305F",
  "notify.titleApproval": "DSH \u304C\u627F\u8A8D\u3092\u5F85\u3063\u3066\u3044\u307E\u3059",
  "notify.titleQuestion": "DSH \u304C\u56DE\u7B54\u3092\u5F85\u3063\u3066\u3044\u307E\u3059",
  "notify.titlePlanReview": "DSH \u304C\u8A08\u753B\u306E\u30EC\u30D3\u30E5\u30FC\u3092\u5F85\u3063\u3066\u3044\u307E\u3059",
  "notify.pendingBody": "\u672A\u51E6\u7406\u306E\u64CD\u4F5C\u304C\u3042\u308A\u307E\u3059",
  "notify.emptyBody": "\u30BF\u30B9\u30AF\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F",
  "notify.open": "\u4F1A\u8A71\u3092\u958B\u304F",
  "notify.dismiss": "\u901A\u77E5\u3092\u9589\u3058\u308B",
  "notify.inAppLabel": "\u4F1A\u8A71\u306E\u901A\u77E5",
  "notify.testTitle": "DSH \u901A\u77E5\u30C6\u30B9\u30C8",
  "notify.testBody": "\u3053\u306E\u901A\u77E5\u304C\u8868\u793A\u3055\u308C\u3066\u3044\u308C\u3070\u3001\u901A\u77E5\u306F\u6B63\u3057\u304F\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u3059\u3002"
};

// src/client/locales/pt.ts
var pt = {
  "nav": "Notifica\xE7\xF5es",
  "settings.title": "Notifica\xE7\xF5es de conclus\xE3o de tarefas",
  "settings.subtitle": "Receba notifica\xE7\xF5es do sistema ou lembretes no aplicativo quando o DSH termina uma opera\xE7\xE3o ou aguarda entrada, com regras por palavra-chave para filtrar conclus\xF5es.",
  "settings.enabled": "Ativar notifica\xE7\xF5es",
  "settings.enabledDesc": "Desativar interrompe todas as notifica\xE7\xF5es; as regras e prefer\xEAncias s\xE3o mantidas.",
  "settings.permission.title": "Permiss\xE3o do navegador",
  "settings.permission.desc": "Notifica\xE7\xF5es do sistema exigem permiss\xE3o do navegador; lembretes no aplicativo n\xE3o. Conceda abaixo e envie uma notifica\xE7\xE3o de teste do sistema.",
  "settings.permission.granted": "Concedida",
  "settings.permission.denied": "Negada (reative nas configura\xE7\xF5es do site no navegador)",
  "settings.permission.default": "N\xE3o concedida",
  "settings.permission.defaultHint": "A permiss\xE3o para notifica\xE7\xF5es do sistema ainda n\xE3o foi concedida: clique em Solicitar permiss\xE3o e permita no aviso do navegador. Os lembretes no aplicativo n\xE3o s\xE3o afetados.",
  "settings.permission.deniedHint": "A permiss\xE3o para notifica\xE7\xF5es do sistema foi negada: reative nas configura\xE7\xF5es do site no navegador. Os lembretes no aplicativo n\xE3o s\xE3o afetados.",
  "settings.permission.request": "Solicitar permiss\xE3o",
  "settings.permission.test": "Enviar notifica\xE7\xE3o de teste",
  "settings.permission.testSent": "A notifica\xE7\xE3o de teste foi solicitada. Se n\xE3o estiver vis\xEDvel, verifique a permiss\xE3o do site, as configura\xE7\xF5es de notifica\xE7\xE3o do sistema e o modo Foco ou N\xE3o perturbe.",
  "settings.permission.testFailed": "O navegador n\xE3o conseguiu criar a notifica\xE7\xE3o de teste: {message}",
  "settings.when.title": "Quando notificar",
  "settings.when.subtitle": "Escolha quais estados finais acionam uma notifica\xE7\xE3o.",
  "settings.when.completed": "Conclu\xEDdo",
  "settings.when.error": "Falhou",
  "settings.when.aborted": "Cancelado",
  "settings.when.blocked": "Bloqueado",
  "settings.when.maxTokens": "Limite de tokens atingido",
  "settings.pending.title": "Aguardando confirma\xE7\xE3o",
  "settings.pending.subtitle": "Seja avisado quando o DSH aguardar sua aprova\xE7\xE3o, resposta ou revis\xE3o de plano.",
  "settings.pending.approval": "Aguardando aprova\xE7\xE3o",
  "settings.pending.question": "Aguardando uma resposta",
  "settings.pending.planReview": "Aguardando revis\xE3o do plano",
  "settings.rules.title": "Regras por palavra-chave",
  "settings.rules.subtitle": "As regras comparam o texto da resposta do turno e os nomes das ferramentas chamadas. Regras de inclus\xE3o: notificar apenas se alguma corresponder. Regras de exclus\xE3o: suprimir quando corresponderem.",
  "settings.rules.empty": "Ainda n\xE3o h\xE1 regras \u2014 todo estado final ativado notifica.",
  "settings.rules.add": "Adicionar regra",
  "settings.rules.save": "Salvar regras",
  "settings.rules.mode.include": "Incluir",
  "settings.rules.mode.exclude": "Excluir",
  "settings.rules.patternPlaceholder": "Palavra-chave ou express\xE3o regular",
  "settings.rules.regex": "Regex",
  "settings.rules.case": "Diferenciar mai\xFAsculas",
  "settings.rules.remove": "Remover regra",
  "settings.rules.invalid": "O padr\xE3o da regra n\xE3o pode ficar vazio",
  "settings.rules.invalidRegex": "Express\xE3o regular inv\xE1lida",
  "settings.rules.unsaved": "As regras t\xEAm altera\xE7\xF5es n\xE3o salvas",
  "settings.rules.saveHint": "Preencha primeiro o padr\xE3o da regra e depois salve",
  "settings.advanced.title": "Avan\xE7ado",
  "settings.advanced.requireInteraction": "Exigir fechamento manual",
  "settings.advanced.requireInteractionDesc": "Desativa a expira\xE7\xE3o autom\xE1tica dos lembretes no aplicativo; abra ou feche para remov\xEA-los. Apenas cinco s\xE3o mantidos, ent\xE3o um lembrete adicional remove o mais antigo. Solicita notifica\xE7\xF5es do sistema persistentes (o suporte varia conforme navegador e sistema).",
  "settings.advanced.backgroundOnly": "Notifica\xE7\xF5es do sistema em segundo plano, lembretes no aplicativo em primeiro plano",
  "settings.advanced.backgroundOnlyDesc": "Quando ativado, os lembretes de conclus\xE3o e de espera compartilham esta regra: janelas ocultas ou sem foco usam notifica\xE7\xF5es do sistema para qualquer sess\xE3o (permiss\xE3o necess\xE1ria). Janelas vis\xEDveis e em foco mostram lembretes clic\xE1veis e fech\xE1veis no aplicativo apenas para conversas fora da visualiza\xE7\xE3o principal, sem permiss\xE3o de notifica\xE7\xE3o do sistema; a conversa da visualiza\xE7\xE3o principal \xE9 suprimida. Desative para usar notifica\xE7\xF5es do sistema em primeiro e segundo plano, incluindo a conversa atual. Os testes sempre usam notifica\xE7\xF5es do sistema e ignoram esta op\xE7\xE3o. Os lembretes param se o aplicativo for encerrado ou o renderizador for destru\xEDdo.",
  "notify.titleCompleted": "O DSH terminou",
  "notify.titleError": "O DSH falhou",
  "notify.titleAborted": "O DSH foi cancelado",
  "notify.titleBlocked": "O DSH precisa de aten\xE7\xE3o",
  "notify.titleMaxTokens": "O DSH atingiu o limite de tokens",
  "notify.titleApproval": "O DSH precisa da sua aprova\xE7\xE3o",
  "notify.titleQuestion": "O DSH precisa da sua resposta",
  "notify.titlePlanReview": "O DSH precisa da sua revis\xE3o do plano",
  "notify.pendingBody": "H\xE1 uma a\xE7\xE3o pendente",
  "notify.emptyBody": "A tarefa est\xE1 conclu\xEDda",
  "notify.open": "Abrir conversa",
  "notify.dismiss": "Fechar notifica\xE7\xE3o",
  "notify.inAppLabel": "Notifica\xE7\xF5es de conversa",
  "notify.testTitle": "Teste de notifica\xE7\xF5es do DSH",
  "notify.testBody": "Se voc\xEA v\xEA esta notifica\xE7\xE3o, as notifica\xE7\xF5es est\xE3o configuradas corretamente."
};

// src/client/locales/ru.ts
var ru = {
  "nav": "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F",
  "settings.title": "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0438 \u0437\u0430\u0434\u0430\u0447",
  "settings.subtitle": "\u041F\u043E\u043B\u0443\u0447\u0430\u0439\u0442\u0435 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438, \u043A\u043E\u0433\u0434\u0430 DSH \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u0442 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u044E \u0438\u043B\u0438 \u0436\u0434\u0451\u0442 \u0432\u0432\u043E\u0434\u0430; \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043F\u043E \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C \u0441\u043B\u043E\u0432\u0430\u043C \u0444\u0438\u043B\u044C\u0442\u0440\u0443\u044E\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F.",
  "settings.enabled": "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F",
  "settings.enabledDesc": "\u0415\u0441\u043B\u0438 \u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C, \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043D\u0435 \u0431\u0443\u0434\u0443\u0442 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C\u0441\u044F; \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F.",
  "settings.permission.title": "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430",
  "settings.permission.desc": "\u0414\u043B\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0445 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439 \u043D\u0443\u0436\u043D\u043E \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430; \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F\u043C \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438 \u043E\u043D\u043E \u043D\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F. \u0412\u044B\u0434\u0430\u0439\u0442\u0435 \u0435\u0433\u043E \u043D\u0438\u0436\u0435 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u0435 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u043E\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435.",
  "settings.permission.granted": "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E",
  "settings.permission.denied": "\u0417\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E (\u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0441\u0430\u0439\u0442\u0430 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435)",
  "settings.permission.default": "\u041D\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E",
  "settings.permission.defaultHint": "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u043D\u0430 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0435\u0449\u0451 \u043D\u0435 \u0432\u044B\u0434\u0430\u043D\u043E: \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0417\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435\xBB \u0438 \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0432 \u0437\u0430\u043F\u0440\u043E\u0441\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430. \u041D\u0430 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438 \u044D\u0442\u043E \u043D\u0435 \u0432\u043B\u0438\u044F\u0435\u0442.",
  "settings.permission.deniedHint": "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u043D\u0430 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0431\u044B\u043B\u043E \u0437\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E: \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0435\u0433\u043E \u0437\u0430\u043D\u043E\u0432\u043E \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0441\u0430\u0439\u0442\u0430 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435. \u041D\u0430 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438 \u044D\u0442\u043E \u043D\u0435 \u0432\u043B\u0438\u044F\u0435\u0442.",
  "settings.permission.request": "\u0417\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435",
  "settings.permission.test": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435",
  "settings.permission.testSent": "\u0422\u0435\u0441\u0442\u043E\u0432\u043E\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043E. \u0415\u0441\u043B\u0438 \u0435\u0433\u043E \u043D\u0435 \u0432\u0438\u0434\u043D\u043E, \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0441\u0430\u0439\u0442\u0430, \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0445 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439 \u0438 \u0440\u0435\u0436\u0438\u043C \xAB\u041D\u0435 \u0431\u0435\u0441\u043F\u043E\u043A\u043E\u0438\u0442\u044C\xBB.",
  "settings.permission.testFailed": "\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u0441\u043C\u043E\u0433 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435: {message}",
  "settings.when.title": "\u041A\u043E\u0433\u0434\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u044F\u0442\u044C",
  "settings.when.subtitle": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F, \u043F\u0440\u0438 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435.",
  "settings.when.completed": "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E",
  "settings.when.error": "\u041E\u0448\u0438\u0431\u043A\u0430",
  "settings.when.aborted": "\u041F\u0440\u0435\u0440\u0432\u0430\u043D\u043E",
  "settings.when.blocked": "\u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043E",
  "settings.when.maxTokens": "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0442\u043E\u043A\u0435\u043D\u043E\u0432",
  "settings.pending.title": "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F",
  "settings.pending.subtitle": "\u041F\u043E\u043B\u0443\u0447\u0430\u0439\u0442\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435, \u043A\u043E\u0433\u0434\u0430 DSH \u0436\u0434\u0451\u0442 \u0432\u0430\u0448\u0435\u0433\u043E \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0438\u044F, \u043E\u0442\u0432\u0435\u0442\u0430 \u0438\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043B\u0430\u043D\u0430.",
  "settings.pending.approval": "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0438\u044F",
  "settings.pending.question": "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043E\u0442\u0432\u0435\u0442\u0430",
  "settings.pending.planReview": "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043B\u0430\u043D\u0430",
  "settings.rules.title": "\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u043F\u043E \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C \u0441\u043B\u043E\u0432\u0430\u043C",
  "settings.rules.subtitle": "\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442 \u0442\u0435\u043A\u0441\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u0445\u043E\u0434\u0430 \u0438 \u0438\u043C\u0435\u043D\u0430 \u0432\u044B\u0437\u0432\u0430\u043D\u043D\u044B\u0445 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432. \u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F: \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u044F\u0442\u044C, \u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0441\u043B\u0438 \u0441\u043E\u0432\u043F\u0430\u043B\u043E \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E. \u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F: \u043F\u043E\u0434\u0430\u0432\u043B\u044F\u0442\u044C \u043F\u0440\u0438 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0438.",
  "settings.rules.empty": "\u041F\u0440\u0430\u0432\u0438\u043B \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u2014 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442 \u043F\u0440\u0438 \u043B\u044E\u0431\u043E\u043C \u0432\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u043E\u043C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F.",
  "settings.rules.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u043E",
  "settings.rules.save": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u0430",
  "settings.rules.mode.include": "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
  "settings.rules.mode.exclude": "\u0418\u0441\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
  "settings.rules.patternPlaceholder": "\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0438\u043B\u0438 \u0440\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u043E\u0435 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435",
  "settings.rules.regex": "\u0420\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u043E\u0435 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435",
  "settings.rules.case": "\u0423\u0447\u0438\u0442\u044B\u0432\u0430\u0442\u044C \u0440\u0435\u0433\u0438\u0441\u0442\u0440",
  "settings.rules.remove": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u043E",
  "settings.rules.invalid": "\u0428\u0430\u0431\u043B\u043E\u043D \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043D\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C",
  "settings.rules.invalidRegex": "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u0440\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u043E\u0435 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435",
  "settings.rules.unsaved": "\u0412 \u043F\u0440\u0430\u0432\u0438\u043B\u0430\u0445 \u0435\u0441\u0442\u044C \u043D\u0435\u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F",
  "settings.rules.saveHint": "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0448\u0430\u0431\u043B\u043E\u043D \u043F\u0440\u0430\u0432\u0438\u043B\u0430, \u0437\u0430\u0442\u0435\u043C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435",
  "settings.advanced.title": "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u043E",
  "settings.advanced.requireInteraction": "\u0422\u0440\u0435\u0431\u043E\u0432\u0430\u0442\u044C \u0440\u0443\u0447\u043D\u043E\u0433\u043E \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u044F",
  "settings.advanced.requireInteractionDesc": "\u041E\u0442\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u0441\u043A\u0440\u044B\u0442\u0438\u0435 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439 \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438; \u043E\u043D\u0438 \u0438\u0441\u0447\u0435\u0437\u0430\u044E\u0442 \u043F\u0440\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0438 \u0438\u043B\u0438 \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u0438. \u0425\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 \u043F\u044F\u0442\u0438, \u043D\u043E\u0432\u044B\u0439 \u0432\u044B\u0442\u0435\u0441\u043D\u044F\u0435\u0442 \u0441\u0430\u043C\u043E\u0435 \u0441\u0442\u0430\u0440\u043E\u0435. \u0417\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u0442 \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u044B\u0435 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F (\u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u0438 \u041E\u0421).",
  "settings.advanced.backgroundOnly": "\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0432 \u0444\u043E\u043D\u0435, \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438 \u043D\u0430 \u043F\u0435\u0440\u0435\u0434\u043D\u0435\u043C \u043F\u043B\u0430\u043D\u0435",
  "settings.advanced.backgroundOnlyDesc": "\u0415\u0441\u043B\u0438 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E, \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0438 \u0438 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442 \u044D\u0442\u043E \u043F\u0440\u0430\u0432\u0438\u043B\u043E: \u0441\u043A\u0440\u044B\u0442\u044B\u0435 \u0438\u043B\u0438 \u043D\u0435\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043E\u043A\u043D\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0441\u0435\u0441\u0441\u0438\u0439 (\u043D\u0443\u0436\u043D\u043E \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435). \u0412\u0438\u0434\u0438\u043C\u044B\u0435 \u043E\u043A\u043D\u0430 \u0432 \u0444\u043E\u043A\u0443\u0441\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u043A\u043B\u0438\u043A\u0430\u0431\u0435\u043B\u044C\u043D\u044B\u0435 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043E\u0432 \u0432\u043D\u0435 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0433\u043E \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F, \u0431\u0435\u0437 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u043D\u0430 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F; \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440 \u0432 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u043C \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0438 \u043D\u0435 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0435\u0442\u0441\u044F. \u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0438 \u043D\u0430 \u043F\u0435\u0440\u0435\u0434\u043D\u0435\u043C, \u0438 \u043D\u0430 \u0437\u0430\u0434\u043D\u0435\u043C \u043F\u043B\u0430\u043D\u0435, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440. \u0422\u0435\u0441\u0442\u044B \u0432\u0441\u0435\u0433\u0434\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0438 \u043E\u0431\u0445\u043E\u0434\u044F\u0442 \u044D\u0442\u0443 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0443. \u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u043F\u0440\u0435\u043A\u0440\u0430\u0449\u0430\u044E\u0442\u0441\u044F \u043F\u0440\u0438 \u0432\u044B\u0445\u043E\u0434\u0435 \u0438\u0437 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u0443\u043D\u0438\u0447\u0442\u043E\u0436\u0435\u043D\u0438\u0438 \u0440\u0435\u043D\u0434\u0435\u0440\u0435\u0440\u0430.",
  "notify.titleCompleted": "DSH \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0437\u0430\u0434\u0430\u0447\u0443",
  "notify.titleError": "DSH: \u043E\u0448\u0438\u0431\u043A\u0430",
  "notify.titleAborted": "DSH \u043F\u0440\u0435\u0440\u0432\u0430\u043D",
  "notify.titleBlocked": "DSH \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F",
  "notify.titleMaxTokens": "DSH \u0434\u043E\u0441\u0442\u0438\u0433 \u043B\u0438\u043C\u0438\u0442\u0430 \u0442\u043E\u043A\u0435\u043D\u043E\u0432",
  "notify.titleApproval": "DSH \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u0430\u0448\u0435\u0433\u043E \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0438\u044F",
  "notify.titleQuestion": "DSH \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u0430\u0448\u0435\u0433\u043E \u043E\u0442\u0432\u0435\u0442\u0430",
  "notify.titlePlanReview": "DSH \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043B\u0430\u043D\u0430",
  "notify.pendingBody": "\u0415\u0441\u0442\u044C \u043E\u0436\u0438\u0434\u0430\u044E\u0449\u0435\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
  "notify.emptyBody": "\u0417\u0430\u0434\u0430\u0447\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430",
  "notify.open": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440",
  "notify.dismiss": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435",
  "notify.inAppLabel": "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430",
  "notify.testTitle": "\u0422\u0435\u0441\u0442 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439 DSH",
  "notify.testBody": "\u0415\u0441\u043B\u0438 \u0432\u044B \u0432\u0438\u0434\u0438\u0442\u0435 \u044D\u0442\u043E \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435, \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u044B \u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E."
};

// src/client/locales/zh.ts
var zh = {
  "nav": "\u901A\u77E5",
  "settings.title": "\u4EFB\u52A1\u5B8C\u6210\u901A\u77E5",
  "settings.subtitle": "\u5F53 DSH \u5B8C\u6210\u64CD\u4F5C\u6216\u7B49\u5F85\u4EA4\u4E92\u65F6\uFF0C\u901A\u8FC7\u7CFB\u7EDF\u901A\u77E5\u6216\u5E94\u7528\u5185\u63D0\u9192\u901A\u77E5\u4F60\uFF1B\u53EF\u4EE5\u7528\u5173\u952E\u8BCD\u89C4\u5219\u63A7\u5236\u54EA\u4E9B\u5B8C\u6210\u9700\u8981\u63D0\u9192\u3002",
  "settings.enabled": "\u542F\u7528\u901A\u77E5",
  "settings.enabledDesc": "\u5173\u95ED\u540E\u4E0D\u4F1A\u5F39\u51FA\u4EFB\u4F55\u901A\u77E5\uFF0C\u89C4\u5219\u4E0E\u504F\u597D\u8BBE\u7F6E\u4ECD\u4F1A\u4FDD\u7559\u3002",
  "settings.permission.title": "\u6D4F\u89C8\u5668\u6743\u9650",
  "settings.permission.desc": "\u7CFB\u7EDF\u901A\u77E5\u9700\u8981\u6D4F\u89C8\u5668\u6388\u6743\uFF0C\u5E94\u7528\u5185\u63D0\u9192\u65E0\u9700\u6B64\u6743\u9650\u3002\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u6388\u6743\uFF0C\u7136\u540E\u53D1\u9001\u4E00\u6761\u7CFB\u7EDF\u6D4B\u8BD5\u901A\u77E5\u3002",
  "settings.permission.granted": "\u5DF2\u6388\u6743",
  "settings.permission.denied": "\u5DF2\u62D2\u7EDD\uFF08\u8BF7\u5728\u6D4F\u89C8\u5668\u5730\u5740\u680F\u7684\u7AD9\u70B9\u8BBE\u7F6E\u4E2D\u91CD\u65B0\u5F00\u542F\uFF09",
  "settings.permission.default": "\u672A\u6388\u6743",
  "settings.permission.defaultHint": "\u7CFB\u7EDF\u901A\u77E5\u6743\u9650\u5C1A\u672A\u6388\u4E88\uFF1A\u70B9\u51FB\u300C\u8BF7\u6C42\u901A\u77E5\u6743\u9650\u300D\uFF0C\u5E76\u5728\u6D4F\u89C8\u5668\u63D0\u793A\u4E2D\u9009\u62E9\u5141\u8BB8\uFF1B\u5E94\u7528\u5185\u63D0\u9192\u4E0D\u53D7\u6B64\u6743\u9650\u5F71\u54CD\u3002",
  "settings.permission.deniedHint": "\u7CFB\u7EDF\u901A\u77E5\u6743\u9650\u5DF2\u88AB\u62D2\u7EDD\uFF1A\u8BF7\u5728\u6D4F\u89C8\u5668\u5730\u5740\u680F\u5DE6\u4FA7\u7684\u7AD9\u70B9\u8BBE\u7F6E\u4E2D\u91CD\u65B0\u5F00\u542F\uFF1B\u5E94\u7528\u5185\u63D0\u9192\u4E0D\u53D7\u6B64\u6743\u9650\u5F71\u54CD\u3002",
  "settings.permission.request": "\u8BF7\u6C42\u901A\u77E5\u6743\u9650",
  "settings.permission.test": "\u53D1\u9001\u6D4B\u8BD5\u901A\u77E5",
  "settings.permission.testSent": "\u6D4B\u8BD5\u901A\u77E5\u8BF7\u6C42\u5DF2\u53D1\u9001\u3002\u5982\u679C\u6CA1\u6709\u770B\u5230\u901A\u77E5\uFF0C\u8BF7\u68C0\u67E5\u6D4F\u89C8\u5668\u7AD9\u70B9\u6743\u9650\u3001\u7CFB\u7EDF\u901A\u77E5\u8BBE\u7F6E\u4EE5\u53CA\u4E13\u6CE8\u6216\u52FF\u6270\u6A21\u5F0F\u3002",
  "settings.permission.testFailed": "\u6D4F\u89C8\u5668\u65E0\u6CD5\u521B\u5EFA\u6D4B\u8BD5\u901A\u77E5\uFF1A{message}",
  "settings.when.title": "\u901A\u77E5\u65F6\u673A",
  "settings.when.subtitle": "\u9009\u62E9\u54EA\u4E9B\u7ED3\u675F\u72B6\u6001\u89E6\u53D1\u901A\u77E5\u3002",
  "settings.when.completed": "\u6B63\u5E38\u5B8C\u6210",
  "settings.when.error": "\u51FA\u9519",
  "settings.when.aborted": "\u88AB\u4E2D\u6B62",
  "settings.when.blocked": "\u88AB\u963B\u585E",
  "settings.when.maxTokens": "\u8FBE\u5230 Token \u4E0A\u9650",
  "settings.pending.title": "\u7B49\u5F85\u786E\u8BA4",
  "settings.pending.subtitle": "\u5F53 DSH \u7B49\u5F85\u4F60\u5BA1\u6279\u3001\u56DE\u7B54\u95EE\u9898\u6216\u8BC4\u5BA1\u8BA1\u5212\u65F6\u63D0\u9192\u3002",
  "settings.pending.approval": "\u7B49\u5F85\u5BA1\u6279",
  "settings.pending.question": "\u7B49\u5F85\u56DE\u7B54\u95EE\u9898",
  "settings.pending.planReview": "\u7B49\u5F85\u8BA1\u5212\u8BC4\u5BA1",
  "settings.rules.title": "\u5173\u952E\u8BCD\u89C4\u5219",
  "settings.rules.subtitle": "\u89C4\u5219\u5339\u914D\u8BE5\u8F6E\u56DE\u590D\u6587\u672C\u4E0E\u8C03\u7528\u8FC7\u7684\u5DE5\u5177\u540D\u3002\u5305\u542B\u89C4\u5219\uFF1A\u547D\u4E2D\u4EFB\u4E00\u624D\u901A\u77E5\uFF1B\u6392\u9664\u89C4\u5219\uFF1A\u547D\u4E2D\u5373\u4E0D\u901A\u77E5\u3002",
  "settings.rules.empty": "\u6682\u65E0\u89C4\u5219\uFF0C\u6240\u6709\u5DF2\u542F\u7528\u7684\u5B8C\u6210\u72B6\u6001\u90FD\u4F1A\u901A\u77E5\u3002",
  "settings.rules.add": "\u6DFB\u52A0\u89C4\u5219",
  "settings.rules.save": "\u4FDD\u5B58\u89C4\u5219",
  "settings.rules.mode.include": "\u5305\u542B",
  "settings.rules.mode.exclude": "\u6392\u9664",
  "settings.rules.patternPlaceholder": "\u5173\u952E\u8BCD\u6216\u6B63\u5219\u8868\u8FBE\u5F0F",
  "settings.rules.regex": "\u6B63\u5219",
  "settings.rules.case": "\u533A\u5206\u5927\u5C0F\u5199",
  "settings.rules.remove": "\u5220\u9664\u89C4\u5219",
  "settings.rules.invalid": "\u89C4\u5219\u6A21\u5F0F\u4E0D\u80FD\u4E3A\u7A7A",
  "settings.rules.invalidRegex": "\u65E0\u6548\u7684\u6B63\u5219\u8868\u8FBE\u5F0F",
  "settings.rules.unsaved": "\u89C4\u5219\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539",
  "settings.rules.saveHint": "\u5148\u586B\u5199\u89C4\u5219\u6A21\u5F0F\uFF0C\u518D\u70B9\u4FDD\u5B58",
  "settings.advanced.title": "\u9AD8\u7EA7",
  "settings.advanced.requireInteraction": "\u9700\u8981\u624B\u52A8\u5173\u95ED",
  "settings.advanced.requireInteractionDesc": "\u5F00\u542F\u540E\uFF0C\u5E94\u7528\u5185\u63D0\u9192\u4E0D\u81EA\u52A8\u6D88\u5931\uFF0C\u53EF\u6253\u5F00\u6216\u5173\u95ED\uFF1B\u6700\u591A\u4FDD\u7559\u4E94\u6761\uFF0C\u8D85\u51FA\u65F6\u79FB\u9664\u6700\u65E9\u7684\u4E00\u6761\u3002\u7CFB\u7EDF\u901A\u77E5\u8BF7\u6C42\u4FDD\u6301\u663E\u793A\uFF08\u53D6\u51B3\u4E8E\u6D4F\u89C8\u5668\u4E0E\u7CFB\u7EDF\u652F\u6301\uFF09\u3002",
  "settings.advanced.backgroundOnly": "\u540E\u53F0\u7CFB\u7EDF\u901A\u77E5\uFF0C\u524D\u53F0\u5E94\u7528\u5185\u63D0\u9192",
  "settings.advanced.backgroundOnlyDesc": "\u5F00\u542F\u65F6\uFF0C\u5B8C\u6210\u4E0E\u7B49\u5F85\u4EA4\u4E92\u5171\u7528\u6B64\u89C4\u5219\uFF1A\u7A97\u53E3\u9690\u85CF\u6216\u5931\u7126\u65F6\uFF0C\u6240\u6709\u4F1A\u8BDD\u90FD\u4F7F\u7528\u7CFB\u7EDF\u901A\u77E5\uFF08\u987B\u5DF2\u6388\u6743\uFF09\uFF1B\u7A97\u53E3\u53EF\u89C1\u4E14\u6709\u7126\u70B9\u65F6\uFF0C\u4EC5\u4E3A\u975E\u4E3B\u89C6\u56FE\u4F1A\u8BDD\u663E\u793A\u53EF\u70B9\u51FB\u8DF3\u8F6C\u3001\u53EF\u5173\u95ED\u7684\u5E94\u7528\u5185\u63D0\u9192\uFF0C\u65E0\u9700\u7CFB\u7EDF\u901A\u77E5\u6743\u9650\uFF0C\u4E3B\u89C6\u56FE\u4F1A\u8BDD\u4E0D\u63D0\u9192\u3002\u5173\u95ED\u540E\u524D\u540E\u53F0\u6240\u6709\u4F1A\u8BDD\u5747\u4F7F\u7528\u7CFB\u7EDF\u901A\u77E5\uFF0C\u5305\u62EC\u5F53\u524D\u4F1A\u8BDD\u3002\u6D4B\u8BD5\u59CB\u7EC8\u4F7F\u7528\u7CFB\u7EDF\u901A\u77E5\u5E76\u7ED5\u8FC7\u6B64\u9879\uFF1B\u9000\u51FA\u7A0B\u5E8F\u6216\u9500\u6BC1\u6E32\u67D3\u9875\u9762\u540E\u65E0\u6CD5\u63D0\u9192\u3002",
  "notify.titleCompleted": "DSH \u5DF2\u5B8C\u6210\u4EFB\u52A1",
  "notify.titleError": "DSH \u51FA\u9519\u4E86",
  "notify.titleAborted": "DSH \u5DF2\u4E2D\u6B62",
  "notify.titleBlocked": "DSH \u9700\u8981\u5904\u7406",
  "notify.titleMaxTokens": "DSH \u8FBE\u5230 Token \u4E0A\u9650",
  "notify.titleApproval": "DSH \u9700\u8981\u4F60\u7684\u5BA1\u6279",
  "notify.titleQuestion": "DSH \u9700\u8981\u4F60\u7684\u56DE\u7B54",
  "notify.titlePlanReview": "DSH \u9700\u8981\u4F60\u8BC4\u5BA1\u8BA1\u5212",
  "notify.pendingBody": "\u6709\u5F85\u5904\u7406\u7684\u64CD\u4F5C",
  "notify.emptyBody": "\u4EFB\u52A1\u5DF2\u5B8C\u6210",
  "notify.open": "\u6253\u5F00\u5BF9\u8BDD",
  "notify.dismiss": "\u5173\u95ED\u63D0\u9192",
  "notify.inAppLabel": "\u5BF9\u8BDD\u63D0\u9192",
  "notify.testTitle": "DSH \u901A\u77E5\u6D4B\u8BD5",
  "notify.testBody": "\u5982\u679C\u4F60\u770B\u5230\u8FD9\u6761\u901A\u77E5\uFF0C\u8BF4\u660E\u901A\u77E5\u5DF2\u914D\u7F6E\u6210\u529F\u3002"
};

// src/client/locales.ts
var NS = "notification";
var DICTIONARIES = { zh, en, ja, es, fr, de, ru, pt };

// src/client/styles.ts
var STYLE_ID = "dsh-notification-style";
var cssText = `
.dsh_notification_section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.dsh_notification_navIcon {
  display: block;
  border-radius: 4px;
}
.dsh_notification_heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dsh_notification_title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}
.dsh_notification_subtitle {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
}
.dsh_notification_cardTitle {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
}
.dsh_notification_cardDesc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  min-width: 0;
}
.dsh_notification_toggleRow {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  cursor: pointer;
}
.dsh_notification_checkbox {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 3px 0 0;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dsh_notification_toggleText {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.dsh_notification_toggleLabel {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 22px;
}
.dsh_notification_toggleDesc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_permissionRow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.dsh_notification_badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 11px;
  font-size: 12px;
  line-height: 16px;
}
.dsh_notification_badgeGranted {
  color: var(--dsw-alias-state-success-primary);
  background: var(--dsw-alias-state-success-tertiary);
}
.dsh_notification_badgeDenied {
  color: var(--dsw-alias-state-error-primary);
  background: var(--dsw-alias-interactive-bg-hover-danger);
}
.dsh_notification_badgeDefault {
  color: var(--dsw-alias-state-warn-label);
  background: var(--dsw-alias-state-warn-tertiary);
}
.dsh_notification_button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 14px;
  border-radius: 14px;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.dsh_notification_buttonPrimary {
  border: 0;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
}
.dsh_notification_buttonPrimary:hover {
  background: var(--dsw-alias-button-primary-hover);
}
.dsh_notification_buttonPrimary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dsh_notification_buttonGhost {
  border: 1px solid var(--dsw-alias-border-l2);
  background: none;
  color: var(--dsw-alias-label-primary);
}
.dsh_notification_buttonGhost:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh_notification_rules {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.dsh_notification_ruleRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2);
}
.dsh_notification_ruleSelect {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.dsh_notification_ruleInput {
  flex: 1;
  min-width: 160px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
}
.dsh_notification_ruleInput:focus {
  outline: none;
  border-color: var(--dsw-alias-brand-primary);
}
.dsh_notification_ruleCheck {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.dsh_notification_ruleCheck input {
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dsh_notification_ruleDelete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 14px;
  background: none;
  color: var(--dsw-alias-label-dimmed);
  cursor: pointer;
}
.dsh_notification_ruleDelete:hover {
  background: var(--dsw-alias-interactive-bg-hover-danger);
  color: var(--dsw-alias-state-error-primary);
}
.dsh_notification_ruleDelete svg {
  width: 14px;
  height: 14px;
}
.dsh_notification_error {
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_notification_hint {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_notification_empty {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_notification_unsavedHint {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_notification_rulesFooter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.dsh_notification_toastStack {
  position: fixed;
  top: 40px;
  left: 50%;
  right: auto;
  bottom: auto;
  z-index: 1100;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: min(640px, calc(100vw - 48px));
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  pointer-events: none;
}
.dsh_notification_toast {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  min-width: 0;
  max-width: 100%;
  padding: 12px 16px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-toast-bg);
  color: var(--dsw-alias-toast-label);
  font-size: 14px;
  line-height: 22px;
  box-shadow: var(--dsw-shadow-lv3);
  white-space: normal;
  overflow-wrap: anywhere;
  pointer-events: none;
}
.dsh_notification_toastText {
  min-width: 0;
}
.dsh_notification_toastAction {
  display: inline;
  padding: 0;
  border: 0;
  background: none;
  color: var(--dsw-static-deepseek-400);
  font: inherit;
  cursor: pointer;
  margin-inline: 3px;
  pointer-events: auto;
}
.dsh_notification_toastAction:hover {
  opacity: 0.8;
}
.dsh_notification_toastAction:focus-visible {
  outline: 2px solid var(--dsw-static-deepseek-400);
  outline-offset: 2px;
}
`;
function adoptStyles() {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}

// src/client/snapshot-store.ts
var import_dsh_client_store = require("@deepseek-ai/dsh-client-store");

// src/client/store.ts
function defaultNotificationSettings() {
  return {
    enabled: true,
    notifyCompleted: true,
    notifyError: true,
    notifyAborted: false,
    notifyBlocked: false,
    notifyMaxTokens: false,
    notifyApproval: true,
    notifyQuestion: true,
    notifyPlanReview: false,
    rules: [],
    requireInteraction: false,
    backgroundOnly: true
  };
}
var V2_PERSIST_KEY = "dsh-notification.v2";
var V3_PERSIST_KEY = "dsh-notification.v3";
function migrateV2Settings(storage) {
  const target = storage ?? (typeof localStorage === "undefined" ? void 0 : localStorage);
  if (target === void 0) return void 0;
  try {
    const raw = target.getItem(V2_PERSIST_KEY);
    if (raw === null) return void 0;
    target.removeItem(V2_PERSIST_KEY);
    const saved = JSON.parse(raw);
    return { ...defaultNotificationSettings(), ...saved, backgroundOnly: true };
  } catch {
    return void 0;
  }
}
function migrateV3Settings(storage) {
  const target = storage ?? (typeof localStorage === "undefined" ? void 0 : localStorage);
  if (target === void 0) return void 0;
  try {
    const raw = target.getItem(V3_PERSIST_KEY);
    if (raw === null) return void 0;
    target.removeItem(V3_PERSIST_KEY);
    return { ...defaultNotificationSettings(), ...JSON.parse(raw) };
  } catch {
    return void 0;
  }
}
function createNotificationSettingsStore() {
  return (0, import_dsh_client_store.createSnapshotStore)(migrateV3Settings() ?? migrateV2Settings() ?? defaultNotificationSettings(), {
    persist: { name: "dsh-notification.v4" }
  });
}

// src/client/in-app.ts
var MAX_VISIBLE = 5;
var AUTO_DISMISS_MS = 8e3;
function createInAppNotifications(onActivate) {
  const notifications = (0, import_dsh_client_store.createSnapshotStore)([]);
  const timers = /* @__PURE__ */ new Map();
  let disposed = false;
  const clearTimer = (id) => {
    const timer = timers.get(id);
    if (timer === void 0) return;
    clearTimeout(timer);
    timers.delete(id);
  };
  const dismiss = (id) => {
    clearTimer(id);
    const current = notifications.getSnapshot();
    const next = current.filter((item) => item.id !== id);
    if (next.length !== current.length) notifications.set(next);
  };
  const show = (item, requireInteraction) => {
    if (disposed) return;
    clearTimer(item.id);
    const next = [...notifications.getSnapshot().filter((current) => current.id !== item.id), item];
    while (next.length > MAX_VISIBLE) clearTimer(next.shift().id);
    if (!requireInteraction) timers.set(item.id, setTimeout(() => {
      dismiss(item.id);
    }, AUTO_DISMISS_MS));
    notifications.set(next);
  };
  const activate = (id) => {
    if (disposed) return;
    const item = notifications.getSnapshot().find((current) => current.id === id);
    if (item === void 0) return;
    try {
      onActivate(item.target);
    } catch {
    } finally {
      dismiss(id);
    }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const id of timers.keys()) clearTimer(id);
    if (notifications.getSnapshot().length > 0) notifications.set([]);
  };
  return { notifications, show, dismiss, activate, dispose };
}

// src/client/InAppNotifications.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function InAppNotifications({ useNotifications, dismiss, activate, t }) {
  const notifications = useNotifications((snapshot) => snapshot);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "div",
    {
      className: "dsh_notification_toastStack",
      style: { pointerEvents: "none" },
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "false",
      "aria-label": t("notify.inAppLabel"),
      children: notifications.map((item) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("article", { className: "dsh_notification_toast", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dsh_notification_toastText", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsh_notification_toastTitle", children: item.title }),
        " \xB7 ",
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsh_notification_toastSession", children: item.sessionTitle }),
        ": ",
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsh_notification_toastBody", children: item.body }),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "button",
          {
            type: "button",
            className: "dsh_notification_toastAction",
            onClick: () => {
              activate(item.id);
            },
            children: t("notify.open")
          }
        ),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "button",
          {
            type: "button",
            className: "dsh_notification_toastAction",
            "aria-label": t("notify.dismiss"),
            title: t("notify.dismiss"),
            onClick: () => {
              dismiss(item.id);
            },
            children: t("notify.dismiss")
          }
        )
      ] }) }, item.id))
    }
  );
}

// src/client/click.ts
function activateNotificationTarget(target, deps) {
  if (target === void 0) return;
  if (deps.openSession === void 0) return;
  try {
    if (!deps.isListed(target.sessionId)) {
      deps.log?.(`[dsh-notification] session ${target.sessionId} is no longer listed; the click only focused the window`);
      return;
    }
    deps.openSession(target.sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.log?.(`[dsh-notification] opening session ${target.sessionId} failed: ${message}`);
  }
}

// src/client/decision.ts
function asReason(reason) {
  switch (reason) {
    case "completed":
    case "error":
    case "aborted":
    case "blocked":
    case "max-tokens":
      return reason;
    default:
      return void 0;
  }
}
function reasonEnabled(settings, reason) {
  switch (reason) {
    case "completed":
      return settings.notifyCompleted;
    case "error":
      return settings.notifyError;
    case "aborted":
      return settings.notifyAborted;
    case "blocked":
      return settings.notifyBlocked;
    case "max-tokens":
      return settings.notifyMaxTokens;
  }
}
function pendingReasonEnabled(settings, kind) {
  switch (kind) {
    case "approval":
      return settings.notifyApproval;
    case "question":
      return settings.notifyQuestion;
    case "plan-review":
      return settings.notifyPlanReview;
  }
}
function ruleSubject(title, body, tools) {
  const parts = [];
  if (title !== void 0 && title.trim() !== "") parts.push(title);
  if (body.trim() !== "") parts.push(body);
  if (tools.length > 0) parts.push(tools.join(" "));
  return parts.join("\n");
}
function ruleMatches(rule, subject) {
  if (rule.isRegex) {
    const flags = rule.caseSensitive ? "" : "i";
    return new RegExp(rule.pattern, flags).test(subject);
  }
  const haystack = rule.caseSensitive ? subject : subject.toLowerCase();
  const needle = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
  return haystack.includes(needle);
}
function rulesAllow(settings, subject) {
  const active = settings.rules.filter((rule) => rule.enabled);
  const includes = active.filter((rule) => rule.mode === "include");
  const excludes = active.filter((rule) => rule.mode === "exclude");
  if (excludes.some((rule) => ruleMatches(rule, subject))) return false;
  if (includes.length > 0 && !includes.some((rule) => ruleMatches(rule, subject))) return false;
  return true;
}
function shouldNotify(settings, reason, subject) {
  if (!settings.enabled) return false;
  if (!reasonEnabled(settings, reason)) return false;
  return rulesAllow(settings, subject);
}

// src/client/runner.ts
function projectionAdvance(prevTurn, projection) {
  if (projection === void 0) return { nextTurn: prevTurn, fresh: false };
  const turn = projection.turn;
  return { nextTurn: Math.max(prevTurn ?? turn, turn), fresh: prevTurn !== void 0 && turn > prevTurn };
}
function notificationFor(sessionId, origin, title, projection, settings) {
  if (origin === "subagent") return null;
  const reason = projection === void 0 || projection.turn === 0 ? "completed" : asReason(projection.reason);
  if (reason === void 0) return null;
  const subject = ruleSubject(title, projection?.body ?? "", projection?.tools ?? []);
  if (!shouldNotify(settings, reason, subject)) return null;
  return {
    reason,
    body: projection?.body ?? title ?? "",
    tag: notificationTag(sessionId, projection?.turn ?? 0)
  };
}
function pendingAdvance(prev, kind) {
  if (prev === void 0) return { kind, fresh: false };
  return { kind, fresh: kind !== void 0 && kind !== prev.kind };
}
function pendingNotificationFor(sessionId, origin, title, kind, sequence, settings) {
  if (origin === "subagent") return null;
  if (!settings.enabled || !pendingReasonEnabled(settings, kind)) return null;
  if (!rulesAllow(settings, ruleSubject(title, "", []))) return null;
  return { kind, body: title?.trim() ?? "", tag: pendingNotificationTag(sessionId, sequence) };
}

// src/client/index.ts
var inject = ["sessions", "slots", "locale"];
function isInView(state, id) {
  return (state.byId[id]?.retainedBy?.mainView ?? 0) > 0;
}
function asPendingKind(value) {
  return value === "approval" || value === "question" || value === "plan-review" ? value : void 0;
}
function apply(ctx) {
  adoptStyles();
  console.info("[dsh-notification] bundle loaded (completion and pending-interaction notifications, settings v4)");
  ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), "dsh-notification: dictionaries");
  const t = ctx.locale.bind(NS);
  const sessions = ctx.get("sessions");
  let uiWorkspace;
  ctx.inject(["uiWorkspace"], (scope) => {
    uiWorkspace = scope.get("uiWorkspace");
    return () => {
      uiWorkspace = void 0;
    };
  });
  const isListed = (id) => {
    const state = sessions.list.getSnapshot();
    return state.ids.includes(id) || state.byId[id] !== void 0;
  };
  const log = (message) => {
    console.info(message);
  };
  const slots = ctx.slots;
  const settings = createNotificationSettingsStore();
  const set = (patch) => {
    settings.update((draft) => {
      Object.assign(draft, patch);
    });
  };
  const requestPermission = () => notificationsApi()?.requestPermission() ?? Promise.resolve("denied");
  const activate = (target) => {
    window.focus();
    const navigation = uiWorkspace;
    activateNotificationTarget(target, {
      isListed,
      openSession: navigation === void 0 ? void 0 : navigation.openSession.bind(navigation),
      log
    });
  };
  const inApp = createInAppNotifications(activate);
  ctx.effect(() => () => inApp.dispose(), "dsh-notification: in-app notifications");
  const show = (title, body, tag, requireInteraction, target) => {
    const result = createBrowserNotification(notificationsApi(), title, { body, tag, requireInteraction });
    if (!result.ok) {
      console.error(`[dsh-notification] notification creation failed: ${result.message}`);
      return result;
    }
    result.notification.onclick = () => {
      activate(target);
    };
    result.notification.onerror = () => {
      console.error("[dsh-notification] the browser reported a notification delivery error");
    };
    return result;
  };
  const deliver = (surface, title, body, tag, current, summary) => {
    if (surface === "system") {
      show(title, body, tag, current.requireInteraction, { sessionId: summary.id });
    } else if (surface === "in-app") {
      inApp.show({
        id: tag,
        title,
        body,
        sessionTitle: summary.displayTitle ?? summary.title ?? summary.id,
        target: { sessionId: summary.id }
      }, current.requireInteraction);
    }
  };
  const sendTest = () => {
    return show(t("notify.testTitle"), t("notify.testBody"), `dsh-notification-test-${Date.now()}`, false);
  };
  ctx.effect(() => {
    const observedTurn = /* @__PURE__ */ new Map();
    const initial = sessions.list.getSnapshot();
    for (const id of initial.ids) {
      const turn = initial.byId[id]?.projectionValues?.notification?.turn;
      if (turn !== void 0) observedTurn.set(id, turn);
    }
    const reseed = () => {
      observedTurn.clear();
    };
    const stopReset = ctx.on("connection/reset", reseed);
    const off = sessions.list.subscribe(() => {
      const state = sessions.list.getSnapshot();
      const current = settings.getSnapshot();
      for (const id of state.ids) {
        const summary = state.byId[id];
        if (summary === void 0) continue;
        const projection = summary.projectionValues?.notification;
        const { nextTurn, fresh } = projectionAdvance(observedTurn.get(id), projection);
        if (nextTurn !== void 0) observedTurn.set(id, nextTurn);
        if (!fresh) continue;
        const plan = notificationFor(summary.id, summary.origin, summary.title, projection, current);
        if (plan === null) {
          console.info(`[dsh-notification] turn ${nextTurn} ${id} suppressed by settings/rules`);
          continue;
        }
        const permission = notificationsApi()?.permission ?? "denied";
        const hidden = document.hidden;
        const focused = document.hasFocus();
        const surface = notificationSurface(permission, current.backgroundOnly, hidden, focused, isInView(state, id));
        console.info(
          `[dsh-notification] turn ${nextTurn} ${id}: reason=${plan.reason} surface=${surface} (permission=${permission} backgroundOnly=${current.backgroundOnly} hidden=${hidden} focused=${focused})`
        );
        deliver(surface, t(titleKey(plan.reason)), bodyText(plan.body, t("notify.emptyBody")), plan.tag, current, summary);
      }
      const live = new Set(state.ids);
      for (const id of [...observedTurn.keys()]) {
        if (!live.has(id)) observedTurn.delete(id);
      }
    });
    return () => {
      off();
      stopReset();
    };
  }, "dsh-notification: completion runner");
  ctx.effect(() => {
    const observed = /* @__PURE__ */ new Map();
    const sequences = /* @__PURE__ */ new Map();
    let uiSession;
    const pendingKind = (id) => asPendingKind(uiSession?.sessionStatus?.getSnapshot().get(id)?.pendingInteraction?.kind);
    const seed = (state) => {
      const live = new Set(state.ids);
      for (const id of state.ids) observed.set(id, { kind: pendingKind(id) });
      for (const id of [...observed.keys()]) {
        if (!live.has(id)) {
          observed.delete(id);
          sequences.delete(id);
        }
      }
    };
    seed(sessions.list.getSnapshot());
    const reseed = () => {
      observed.clear();
      seed(sessions.list.getSnapshot());
    };
    const stopReset = ctx.on("connection/reset", reseed);
    const run = () => {
      const state = sessions.list.getSnapshot();
      const current = settings.getSnapshot();
      for (const id of state.ids) {
        const summary = state.byId[id];
        if (summary === void 0) continue;
        const kind = pendingKind(id);
        const previous = observed.get(id);
        const next = pendingAdvance(previous, kind);
        observed.set(id, { kind: next.kind });
        if (!next.fresh || next.kind === void 0) continue;
        const sequence = (sequences.get(id) ?? 0) + 1;
        sequences.set(id, sequence);
        const plan = pendingNotificationFor(
          summary.id,
          summary.origin,
          summary.displayTitle,
          next.kind,
          sequence,
          current
        );
        if (plan === null) continue;
        const permission = notificationsApi()?.permission ?? "denied";
        const hidden = document.hidden;
        const focused = document.hasFocus();
        const surface = notificationSurface(permission, current.backgroundOnly, hidden, focused, isInView(state, id));
        deliver(surface, t(pendingTitleKey(plan.kind)), bodyText(plan.body, t("notify.pendingBody")), plan.tag, current, summary);
      }
      seed(state);
    };
    const off = sessions.list.subscribe(run);
    ctx.inject(["uiSession"], (scope) => {
      uiSession = scope.get("uiSession");
      seed(sessions.list.getSnapshot());
      const offPending = uiSession?.sessionStatus?.subscribe(run);
      return () => {
        offPending?.();
        uiSession = void 0;
      };
    });
    return () => {
      off();
      stopReset();
    };
  }, "dsh-notification: pending runner");
  slots.inject("settings.section", () => slots.register({
    name: "settings.section",
    id: "notification",
    order: 60,
    label: () => t("nav"),
    locale: NS,
    inject: () => ({
      hooks: { settings },
      set,
      requestPermission,
      sendTest
    })
  }, NotificationSettingsSection));
  slots.inject("settings.section.icon", () => slots.register({
    name: "settings.section.icon",
    id: "notification"
  }, NotificationSectionIcon));
  slots.inject("shell.overlay", () => slots.register({
    name: "shell.overlay",
    id: "notification.toasts",
    order: 60,
    locale: NS,
    inject: () => ({
      hooks: { notifications: inApp.notifications },
      dismiss: inApp.dismiss,
      activate: inApp.activate
    })
  }, InAppNotifications));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
