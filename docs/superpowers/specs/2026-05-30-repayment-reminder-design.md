# Repayment Reminder Design

## Summary

Add WeChat repayment reminders for credit card and loan/debt accounts. Each eligible account can enable one reminder rule with a monthly repayment day and one advance-days value. All reminders use one global reminder time. Reminders are sent only to the current Mini Program user's bound WeChat identity, represented by that user's `openid`.

## Goals

- Support repayment reminders for account categories whose type is `credit` or `debt`.
- Let each eligible account configure:
  - reminder enabled or disabled;
  - monthly repayment day from 1 to 31;
  - one advance-days value.
- Let the app configure one global reminder time, defaulting to `09:00`.
- Send WeChat Mini Program subscription messages from a cloud function to the owning `openid`.
- Preserve old data compatibility. Existing accounts without reminder fields must behave exactly as disabled reminders.
- Preserve existing unit test behavior and keep existing fixtures valid without adding the new fields.

## Non-Goals

- Multiple reminder points per account, such as 7 days plus 3 days plus same day.
- Account-specific reminder times.
- Reminders for asset, investment, receivable, or virtual accounts.
- Inferring repayment rules from transactions.
- Implementing an alternate SMS, email, or public-account notification channel.

## Data Model

Account objects may include these optional fields:

```js
{
  repaymentReminderEnabled: true,
  repaymentDay: 10,
  repaymentAdvanceDays: 3,
  lastRepaymentReminderKey: "2026-06-07:account-id"
}
```

Settings may include:

```js
{
  repaymentReminderTime: "09:00"
}
```

All new account fields are optional. Missing `repaymentReminderEnabled` or a non-true value means the account is not eligible for reminder sending. Missing or invalid `repaymentDay` and `repaymentAdvanceDays` are treated as an incomplete disabled reminder rule. This keeps existing `accounts.json` files and unit test fixtures valid.

## Repayment Date Rules

- `repaymentDay` means "day of month".
- If the configured day does not exist in the current month, the actual repayment date is the last day of that month.
- The reminder date is `actualRepaymentDate - repaymentAdvanceDays`.
- If the reminder date falls in the previous month, it still sends on that previous-month date.
- `repaymentAdvanceDays` is a non-negative integer. `0` means same-day reminder.

Examples:

- Repayment day `10`, advance `3`, June 2026 repayment date `2026-06-10` -> reminder date `2026-06-07`.
- Repayment day `31`, advance `1`, February 2026 repayment date `2026-02-28` -> reminder date `2026-02-27`.
- Repayment day `1`, advance `3`, June 2026 repayment date `2026-06-01` -> reminder date `2026-05-29`.

## User Experience

### Account Edit

The account edit page shows repayment reminder controls only when the selected account category type is `credit` or `debt`.

Controls:

- Reminder switch.
- Repayment day selector or numeric input, constrained to 1-31.
- Advance-days numeric input, constrained to a non-negative integer.

When an account category changes away from `credit` or `debt`, the reminder controls are hidden. Existing reminder fields may remain stored, but reminder calculation must ignore non-eligible account types.

When saving an enabled reminder, the page requests WeChat subscription-message authorization with `wx.requestSubscribeMessage`. If authorization is denied, the account may still save, but the UI should tell the user that WeChat reminders require subscription authorization.

### Settings

The settings page adds one global repayment reminder time, defaulting to `09:00`. This is stored with existing user data patterns and must not affect record, account, or category data loading.

## Cloud Function Flow

The existing `quickstartFunctions` cloud function will add reminder-related entry points while preserving existing `getOpenId`, `readStorageData`, `writeStorageData`, and `createBackupData` behavior.

Planned cloud function responsibilities:

- Read user account data.
- Determine which enabled `credit` and `debt` accounts are due for reminder at the current date and global reminder time.
- Send a Mini Program subscription message with `cloud.openapi.subscribeMessage.send`.
- Include a page path to the account detail page for the target account.
- Update `lastRepaymentReminderKey` after a successful send, so the same account is not sent twice for the same reminder date.

The real subscription message `templateId` must be configured outside the source code, such as cloud function environment config or a small deployment-only config file that is not populated with secrets in the repository. The Mini Program account must apply for a matching subscription message template in the WeChat public platform.

## Scheduling

Configure a cloud-function timer trigger. The implementation can run hourly and send only when current local time matches the configured global reminder time window. This is more tolerant than relying on an exact once-per-day invocation.

The reminder calculation should use the intended business timezone for this app, `Asia/Shanghai`.

## Compatibility

- Existing account objects without reminder fields default to reminder disabled.
- Existing settings without `repaymentReminderTime` default to `09:00`.
- Existing cloud storage files remain valid JSON and do not require migration before app startup.
- Existing tests and fixtures must not be updated just to include optional reminder fields.
- Existing balance calculation, account grouping, account detail, statistics, local cache, cloud storage, and import/export behavior must remain unchanged unless a test directly covers the new reminder feature.

## Testing

Add focused unit tests for pure reminder logic:

- credit and debt accounts are eligible when reminder is enabled;
- old accounts without new fields are ignored;
- asset, investment, virtual, and receivable accounts are ignored even if reminder fields exist;
- month-end fallback for repayment day 29, 30, or 31;
- advance-days calculation, including same-day and previous-month reminder dates;
- duplicate-send protection through `lastRepaymentReminderKey`;
- default global reminder time is `09:00`.

Run the existing full test suite after implementation to confirm older tests are unaffected.

## Risks and Constraints

- WeChat subscription messages require user authorization and a valid template. Code can request and send messages, but actual delivery depends on the user's subscription state and WeChat template/category rules.
- Ordinary one-time subscription authorization may not support unlimited future reminders. If WeChat's current rules require repeated user authorization, the UI must make that clear and allow the user to re-authorize.
- The cloud function must not send reminders to any `openid` other than the owner of the account data being scanned.
